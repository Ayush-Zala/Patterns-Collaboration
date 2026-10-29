/**
 * Analytics Event Bus
 * -------------------
 * A singleton Node.js EventEmitter that acts as the backbone of the
 * analytics event layer. All platform operations emit events here;
 * the AnalyticsAggregator listens and materialises metrics.
 *
 * Event contract — every event MUST include:
 *   { orgId, ts }   — orgId for scoping, ts for time-series bucketing
 *
 * Migration path → replace with Redis pub/sub or BullMQ queue:
 *   Change emit() → queue.add()  and  on() → worker.process()
 *   All other files remain unchanged.
 */

const EventEmitter = require("events");

class AnalyticsEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit to prevent MaxListenersExceededWarning
    this.setMaxListeners(50);
  }

  /**
   * Type-safe emit helper.
   * @param {string} eventName  e.g. "message.received"
   * @param {object} payload    Must include orgId and ts
   */
  publish(eventName, payload) {
    if (!payload.orgId) {
      console.warn(`[AnalyticsEventBus] Event "${eventName}" missing orgId — skipped`);
      return;
    }
    const enriched = {
      ...payload,
      ts: payload.ts ?? new Date().toISOString(),
      _event: eventName,
    };
    this.emit(eventName, enriched);
  }
}

// Singleton export — one bus per process
const analyticsEventBus = new AnalyticsEventBus();
module.exports = { analyticsEventBus };
