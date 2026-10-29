/**
 * Analytics Aggregator
 * --------------------
 * Listens to all events on the AnalyticsEventBus and materialises them
 * into the AnalyticsStore. After every update it broadcasts the new
 * snapshot to connected Socket.io clients in the org's analytics room.
 *
 * This is the ONLY place that knows about both the event bus and the store.
 *
 * Migration path → BullMQ worker:
 *   Replace `bus.on(event, handler)` with `worker.process(event, handler)`.
 *   The store operations and broadcast calls stay identical.
 */

const { analyticsEventBus } = require("./analyticsEventBus");
const { analyticsStore } = require("./analyticsStore");

class AnalyticsAggregator {
  /**
   * @param {{ realtime: import('../realtime/realtimeGateway').RealtimeGateway }} deps
   */
  constructor({ realtime }) {
    this.realtime = realtime;
    this._registerHandlers();
  }

  // ─── Internal helpers ───────────────────────────────────────────────────────

  /**
   * After writing to the store, broadcast updated snapshot via Socket.io.
   * Clients subscribed to room `analytics:{orgId}` receive `analytics_update`.
   */
  _broadcast(orgId) {
    try {
      const snapshot = analyticsStore.getSnapshot(orgId);
      if (this.realtime) {
        this.realtime.broadcastAnalytics(orgId, snapshot);
      }
    } catch (err) {
      console.error("[AnalyticsAggregator] broadcast error:", err.message);
    }
  }

  // ─── Handler registration ────────────────────────────────────────────────────

  _registerHandlers() {
    const bus = analyticsEventBus;

    // ── Messaging events ──────────────────────────────────────────────────────

    bus.on("message.received", (e) => {
      analyticsStore.incrementWorkload(e.orgId, "new_conversations");
      analyticsStore.incrementWorkload(e.orgId, "open_conversations");
      analyticsStore.recordMessage(e.orgId, e.ts);
      if (e.inboxId) {
        analyticsStore.updateInboxWorkload(e.orgId, e.inboxId, { open: 1 });
      }
      this._broadcast(e.orgId);
    });

    bus.on("message.sent", (e) => {
      analyticsStore.recordMessage(e.orgId, e.ts);
      if (e.actorId) {
        analyticsStore.updateTeamWorkload(e.orgId, e.actorId, { open: 1 });
      }
      this._broadcast(e.orgId);
    });

    bus.on("message.reply", (e) => {
      analyticsStore.recordReply(e.orgId);
      analyticsStore.recordMessage(e.orgId, e.ts);
      // Record first-response time if provided
      if (e.firstResponseMs != null && e.firstResponseMs > 0) {
        analyticsStore.recordFirstResponse(e.orgId, e.firstResponseMs);
      }
      this._broadcast(e.orgId);
    });

    // ── Thread events ─────────────────────────────────────────────────────────

    bus.on("thread.created", (e) => {
      analyticsStore.incrementWorkload(e.orgId, "new_conversations");
      analyticsStore.incrementWorkload(e.orgId, "open_conversations");
      analyticsStore.incrementWorkload(e.orgId, "unassigned_conversations");
      analyticsStore.incrementWorkload(e.orgId, "backlog");
      if (e.inboxId) {
        analyticsStore.updateInboxWorkload(e.orgId, e.inboxId, {
          open: 1,
          unassigned: 1,
        });
      }
      this._broadcast(e.orgId);
    });

    bus.on("thread.assigned", (e) => {
      analyticsStore.incrementWorkload(e.orgId, "assigned_conversations");
      analyticsStore.incrementWorkload(e.orgId, "unassigned_conversations", -1);
      if (e.inboxId) {
        analyticsStore.updateInboxWorkload(e.orgId, e.inboxId, {
          assigned: 1,
          unassigned: -1,
        });
      }
      if (e.assignedTo) {
        analyticsStore.updateTeamWorkload(e.orgId, e.assignedTo, { open: 1 });
      }
      this._broadcast(e.orgId);
    });

    bus.on("thread.closed", (e) => {
      analyticsStore.incrementWorkload(e.orgId, "open_conversations", -1);
      analyticsStore.incrementWorkload(e.orgId, "backlog", -1);
      if (e.inboxId) {
        analyticsStore.updateInboxWorkload(e.orgId, e.inboxId, {
          open: -1,
          closed: 1,
        });
      }
      if (e.actorId) {
        analyticsStore.updateTeamWorkload(e.orgId, e.actorId, {
          open: -1,
          closed: 1,
        });
      }
      // Record resolution time if we have both timestamps
      if (e.createdAt && e.ts) {
        const resMs = new Date(e.ts).getTime() - new Date(e.createdAt).getTime();
        if (resMs > 0) {
          analyticsStore.recordResolution(e.orgId, resMs);
        }
      }
      this._broadcast(e.orgId);
    });

    // ── Calendar events ───────────────────────────────────────────────────────
    // NOTE: calendar metrics (meetings_scheduled, meetings_completed, meetings_cancelled)
    // are now computed directly from the live `event` table in analyticsStore.recomputeFromLiveDB().
    // Event bus handlers here trigger a recompute so the dashboard stays in sync.

    bus.on("meeting.created", (e) => {
      analyticsStore.incrementCalendar(e.orgId, "meetings_scheduled");
      this._broadcast(e.orgId);
    });

    bus.on("meeting.completed", (_e) => {
      // meeting.completed is fired on GET /calendar/events for past events.
      // The actual counter is recomputed from the live DB on getSnapshotAsync
      // so we don't need to increment here (prevents double-counting).
    });

    bus.on("meeting.cancelled", (e) => {
      // Status set to "cancelled" — we do a live recompute on next snapshot fetch.
      // No direct counter change needed here.
      this._broadcast(e.orgId);
    });

    bus.on("meeting.deleted", (e) => {
      // Event hard-deleted from DB — decrement scheduled count.
      analyticsStore.incrementCalendar(e.orgId, "meetings_scheduled", -1);
      this._broadcast(e.orgId);
    });

    // ── Contact events ────────────────────────────────────────────────────────

    bus.on("contact.created", (_e) => {
      // Contact count is not aggregated into the main workload metrics,
      // but the handler is here for future extension (e.g. contact growth chart).
    });

    console.log("[AnalyticsAggregator] All event handlers registered.");
  }
}

module.exports = { AnalyticsAggregator };
