/**
 * Analytics Metrics Store
 * -----------------------
 * Organisation-scoped store for computed metrics.
 *
 * PERSISTENCE STRATEGY:
 *   The in-memory Map acts as a write-through cache.
 *   After every write, the full snapshot is serialised and upserted into
 *   the `analyticsmetric` table via Prisma.  On the first access for an
 *   orgId, the store checks the DB and rehydrates — so metrics survive
 *   backend restarts.
 *
 * Shape of orgMetrics[orgId]:
 * {
 *   workload: {
 *     new_conversations:        number,
 *     open_conversations:       number,
 *     assigned_conversations:   number,
 *     unassigned_conversations: number,
 *     backlog:                  number,
 *   },
 *   efficiency: {
 *     total_first_response_ms:  number,
 *     first_response_count:     number,
 *     total_resolution_ms:      number,
 *     resolution_count:         number,
 *     total_replies:            number,
 *     conversations_with_reply: number,
 *   },
 *   busiest: {
 *     messages_by_hour: number[24],
 *     messages_by_day:  number[7],
 *   },
 *   inboxes: { [inboxId]: { open, assigned, unassigned, closed } },
 *   team:    { [userId]:  { open, closed } },
 *   calendar: { meetings_scheduled, meetings_completed, meetings_cancelled },
 *   updatedAt: ISO string,
 * }
 */

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

// Re-use a single Prisma instance — instantiating inside the class would
// create N connections when the module is hot-reloaded in dev.
let _prisma = null;
function getPrisma() {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

class AnalyticsStore {
  constructor() {
    /** @type {Map<string, object>} orgId → raw metrics (write-through cache) */
    this._store = new Map();
    /**
     * Track which orgIds have been rehydrated from DB so we don't re-read
     * on every operation.
     * @type {Set<string>}
     */
    this._rehydrated = new Set();
  }

  // ---------- Internal helpers ----------

  _defaultMetrics() {
    return {
      workload: {
        new_conversations: 0,
        open_conversations: 0,
        assigned_conversations: 0,
        unassigned_conversations: 0,
        backlog: 0,
      },
      efficiency: {
        total_first_response_ms: 0,
        first_response_count: 0,
        total_resolution_ms: 0,
        resolution_count: 0,
        total_replies: 0,
        conversations_with_reply: 0,
      },
      busiest: {
        messages_by_hour: Array(24).fill(0),
        messages_by_day: Array(7).fill(0),
      },
      inboxes: {},
      team: {},
      calendar: {
        meetings_scheduled: 0,
        meetings_completed: 0,
        meetings_cancelled: 0,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Merge a DB-loaded snapshot into the default shape to guard against
   * missing fields if the schema evolves.
   */
  _mergeWithDefaults(stored) {
    const d = this._defaultMetrics();
    if (!stored || typeof stored !== "object") return d;

    return {
      workload:   { ...d.workload,   ...(stored.workload   || {}) },
      efficiency: { ...d.efficiency, ...(stored.efficiency || {}) },
      busiest: {
        messages_by_hour: Array.isArray(stored.busiest?.messages_by_hour)
          ? stored.busiest.messages_by_hour
          : Array(24).fill(0),
        messages_by_day: Array.isArray(stored.busiest?.messages_by_day)
          ? stored.busiest.messages_by_day
          : Array(7).fill(0),
      },
      inboxes:   stored.inboxes   && typeof stored.inboxes   === "object" ? stored.inboxes   : {},
      team:      stored.team      && typeof stored.team      === "object" ? stored.team      : {},
      calendar:  { ...d.calendar,  ...(stored.calendar   || {}) },
      updatedAt: stored.updatedAt || d.updatedAt,
    };
  }

  /**
   * Synchronously get (or initialise) the in-memory metrics for an org.
   * NOTE: Rehydration from DB is async; callers that need the DB data
   * should call `_ensureRehydrated(orgId)` before calling `_ensure(orgId)`.
   */
  _ensure(orgId) {
    if (!this._store.has(orgId)) {
      this._store.set(orgId, this._defaultMetrics());
    }
    return this._store.get(orgId);
  }

  _ensureInbox(metrics, inboxId) {
    if (!metrics.inboxes[inboxId]) {
      metrics.inboxes[inboxId] = { open: 0, assigned: 0, unassigned: 0, closed: 0 };
    }
  }

  _ensureTeamMember(metrics, userId) {
    if (!metrics.team[userId]) {
      metrics.team[userId] = { open: 0, closed: 0 };
    }
  }

  _touch(metrics) {
    metrics.updatedAt = new Date().toISOString();
  }

  /**
   * Load the persisted snapshot from the database for this orgId if we
   * haven't already done so.  Safe to call multiple times — after the
   * first call it is a no-op.
   *
   * After rehydrating from the persisted snapshot, we immediately resync
   * calendar and workload metrics from live database tables to prevent
   * stale accumulated-event counters from persisting across restarts.
   */
  async _ensureRehydrated(orgId) {
    if (this._rehydrated.has(orgId)) return;
    this._rehydrated.add(orgId); // mark immediately to avoid concurrent reads

    try {
      const prisma = getPrisma();
      const row = await prisma.analyticsmetric.findUnique({ where: { orgId } });
      if (row && row.snapshot) {
        const merged = this._mergeWithDefaults(row.snapshot);
        this._store.set(orgId, merged);
        console.log(`[AnalyticsStore] Rehydrated metrics for org ${orgId} from DB`);
      }
    } catch (err) {
      // DB might not have the table yet (first boot before migration).
      // Fail silently — we'll start fresh.
      console.warn(`[AnalyticsStore] Could not rehydrate metrics for org ${orgId}:`, err.message);
    }

    // Always resync from live tables to fix any stale persisted counters
    await this.recomputeFromLiveDB(orgId);
  }

  /**
   * Resync calendar and workload metrics from live DB tables.
   * This prevents stale accumulated-event counters from showing wrong values
   * after events are deleted or if the backend restarts mid-session.
   * Safe to call at any time — it will overwrite the in-memory counters
   * and persist the corrected snapshot.
   */
  async recomputeFromLiveDB(orgId) {
    try {
      const prisma = getPrisma();
      const m = this._ensure(orgId);

      // ── Calendar metrics: count live events from the `event` table ────────
      const now = new Date();

      const [scheduled, completed, cancelled] = await Promise.all([
        // Scheduled = all non-cancelled events with endTime in the future
        prisma.event.count({
          where: { organizationId: orgId, status: { not: "cancelled" } },
        }),
        // Completed = non-cancelled events whose endTime has already passed
        prisma.event.count({
          where: {
            organizationId: orgId,
            status: { not: "cancelled" },
            endTime: { lt: now },
          },
        }),
        // Cancelled = events with status 'cancelled'
        prisma.event.count({
          where: { organizationId: orgId, status: "cancelled" },
        }),
      ]);

      m.calendar.meetings_scheduled = scheduled;
      m.calendar.meetings_completed = completed;
      m.calendar.meetings_cancelled = cancelled;

      // ── Workload metrics: count live threads via inboxes that belong to this org ───
      // Threads don't have an organizationId field directly.
      // We look up inboxes for this org first, then count threads in those inboxes.
      let openThreads = 0, assignedThreads = 0, unassignedThreads = 0, newThreads = 0;

      try {
        const orgInboxes = await prisma.inbox.findMany({
          where: { scopeId: orgId },
          select: { id: true },
        });
        const inboxIds = orgInboxes.map(i => i.id);

        if (inboxIds.length > 0) {
          [openThreads, assignedThreads, unassignedThreads, newThreads] = await Promise.all([
            prisma.thread.count({ where: { inboxId: { in: inboxIds }, status: "open" } }),
            prisma.thread.count({ where: { inboxId: { in: inboxIds }, status: "open", assignedTo: { not: null } } }),
            prisma.thread.count({ where: { inboxId: { in: inboxIds }, status: "open", assignedTo: null } }),
            prisma.thread.count({ where: { inboxId: { in: inboxIds } } }),
          ]);
        }
      } catch (threadErr) {
        console.warn(`[AnalyticsStore] Could not recompute thread workload:`, threadErr.message);
      }

      m.workload.open_conversations = openThreads;
      m.workload.assigned_conversations = assignedThreads;
      m.workload.unassigned_conversations = unassignedThreads;
      m.workload.new_conversations = newThreads;
      m.workload.backlog = openThreads; // backlog = all open threads

      this._touch(m);
      this._persist(orgId);

      console.log(`[AnalyticsStore] Recomputed live metrics for org ${orgId}: scheduled=${scheduled}, completed=${completed}, cancelled=${cancelled}, open_threads=${openThreads}`);
    } catch (err) {
      console.warn(`[AnalyticsStore] Could not recompute live metrics for org ${orgId}:`, err.message);
    }
  }

  /**
   * Persist the current in-memory snapshot for an orgId to the database.
   * Fire-and-forget — we never await this in the hot path.
   */
  _persist(orgId) {
    const m = this._store.get(orgId);
    if (!m) return;

    const snapshot = JSON.parse(JSON.stringify(m)); // deep clone before async
    const prisma = getPrisma();

    prisma.analyticsmetric
      .upsert({
        where:  { orgId },
        update: { snapshot },
        create: { id: crypto.randomUUID(), orgId, snapshot },
      })
      .catch((err) => {
        console.warn(`[AnalyticsStore] Failed to persist metrics for org ${orgId}:`, err.message);
      });
  }

  // ---------- Write methods (called by AnalyticsAggregator) ----------

  /** Increment a simple workload counter */
  incrementWorkload(orgId, key, delta = 1) {
    const m = this._ensure(orgId);
    if (m.workload[key] !== undefined) {
      m.workload[key] = Math.max(0, m.workload[key] + delta);
      this._touch(m);
      this._persist(orgId);
    }
  }

  /** Record a first-response time sample (milliseconds) */
  recordFirstResponse(orgId, ms) {
    const m = this._ensure(orgId);
    m.efficiency.total_first_response_ms += ms;
    m.efficiency.first_response_count += 1;
    this._touch(m);
    this._persist(orgId);
  }

  /** Record a resolution time sample (milliseconds) */
  recordResolution(orgId, ms) {
    const m = this._ensure(orgId);
    m.efficiency.total_resolution_ms += ms;
    m.efficiency.resolution_count += 1;
    this._touch(m);
    this._persist(orgId);
  }

  /** Increment reply count for efficiency metrics */
  recordReply(orgId) {
    const m = this._ensure(orgId);
    m.efficiency.total_replies += 1;
    this._touch(m);
    this._persist(orgId);
  }

  /** Increment message tally for a given UTC datetime */
  recordMessage(orgId, ts) {
    const m = this._ensure(orgId);
    const d = ts ? new Date(ts) : new Date();
    m.busiest.messages_by_hour[d.getUTCHours()] += 1;
    m.busiest.messages_by_day[d.getDay()] += 1;
    this._touch(m);
    this._persist(orgId);
  }

  /** Update per-inbox counters */
  updateInboxWorkload(orgId, inboxId, updates) {
    if (!inboxId) return;
    const m = this._ensure(orgId);
    this._ensureInbox(m, inboxId);
    const inbox = m.inboxes[inboxId];
    for (const [key, delta] of Object.entries(updates)) {
      if (inbox[key] !== undefined) {
        inbox[key] = Math.max(0, inbox[key] + delta);
      }
    }
    this._touch(m);
    this._persist(orgId);
  }

  /** Update per-teammate counters */
  updateTeamWorkload(orgId, userId, updates) {
    if (!userId) return;
    const m = this._ensure(orgId);
    this._ensureTeamMember(m, userId);
    const member = m.team[userId];
    for (const [key, delta] of Object.entries(updates)) {
      if (member[key] !== undefined) {
        member[key] = Math.max(0, member[key] + delta);
      }
    }
    this._touch(m);
    this._persist(orgId);
  }

  /** Increment calendar event counters */
  incrementCalendar(orgId, key, delta = 1) {
    const m = this._ensure(orgId);
    if (m.calendar[key] !== undefined) {
      m.calendar[key] = Math.max(0, m.calendar[key] + delta);
      this._touch(m);
      this._persist(orgId);
    }
  }

  // ---------- Read methods (called by AnalyticsRoutes) ----------

  /**
   * Return a fully-computed metrics snapshot for an org.
   * Derived fields (averages, percentages) are computed here — not stored.
   *
   * This is async so it can rehydrate from the DB on first call.
   */
  async getSnapshotAsync(orgId) {
    await this._ensureRehydrated(orgId);
    return this.getSnapshot(orgId);
  }

  /**
   * Synchronous snapshot — use this only when you know rehydration has
   * already completed (e.g. inside the aggregator hot path).
   */
  getSnapshot(orgId) {
    const m = this._ensure(orgId);

    const avgFirstResponseMs =
      m.efficiency.first_response_count > 0
        ? Math.round(m.efficiency.total_first_response_ms / m.efficiency.first_response_count)
        : 0;

    const avgResolutionMs =
      m.efficiency.resolution_count > 0
        ? Math.round(m.efficiency.total_resolution_ms / m.efficiency.resolution_count)
        : 0;

    const avgRepliesPerConversation =
      m.efficiency.conversations_with_reply > 0
        ? +(m.efficiency.total_replies / m.efficiency.conversations_with_reply).toFixed(1)
        : 0;

    return {
      workload: { ...m.workload },
      efficiency: {
        avg_first_response_ms:        avgFirstResponseMs,
        avg_first_response_min:       Math.round(avgFirstResponseMs / 60000),
        avg_resolution_ms:            avgResolutionMs,
        avg_resolution_hours:         +(avgResolutionMs / 3600000).toFixed(1),
        avg_replies_per_conversation: avgRepliesPerConversation,
      },
      busiest: {
        messages_by_hour: [...m.busiest.messages_by_hour],
        messages_by_day:  [...m.busiest.messages_by_day],
      },
      inboxes:   { ...m.inboxes },
      team:      { ...m.team },
      calendar:  { ...m.calendar },
      updatedAt: m.updatedAt,
    };
  }

  /** List all orgIds that have metrics (useful for debugging) */
  listOrgs() {
    return [...this._store.keys()];
  }
}

// Singleton — one store per process, shared across all handlers
const analyticsStore = new AnalyticsStore();
module.exports = { analyticsStore, AnalyticsStore };
