const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const config = require("../config");
const { analyticsEventBus } = require("../analytics/analyticsEventBus");

class SystemEventService {
  constructor({ realtime, automationEngine }) {
    this.realtime = realtime;
    this.automationEngine = automationEngine;
    this.connection = config.redisUrl ? new IORedis(config.redisUrl, { maxRetriesPerRequest: null }) : null;

    if (this.connection) {
      this.inboundQueue = new Queue("inbound-sync", { connection: this.connection });
      this.outboundQueue = new Queue("outbound-mail", { connection: this.connection });
      this.automationQueue = new Queue("automation-events", { connection: this.connection });
    }

    this.workers = [];
  }

  setServices({ threadService, emailSyncService, mailService }) {
    this.threadService = threadService;
    this.emailSyncService = emailSyncService;
    this.mailService = mailService;
  }

  init() {
    if (!this.connection) {
      console.warn("[SystemEventService] No Redis configured, falling back to synchronous execution");
      return;
    }

    // Automation Worker (formerly system-events)
    const automationWorker = new Worker(
      "automation-events",
      async (job) => {
        await this.handleAutomationEvent(job.data);
      },
      { connection: this.connection }
    );
    this.workers.push(automationWorker);

    // Inbound Sync Worker
    const inboundWorker = new Worker(
      "inbound-sync",
      async (job) => {
        await this.handleInboundEvent(job.data);
      },
      { connection: this.connection }
    );
    this.workers.push(inboundWorker);

    // Outbound Mail Worker
    const outboundWorker = new Worker(
      "outbound-mail",
      async (job) => {
        await this.handleOutboundEvent(job.data);
      },
      { connection: this.connection }
    );
    this.workers.push(outboundWorker);

    this.workers.forEach(w => w.on('error', err => {
      console.error(`[SystemEventService] Worker Error (${w.name}):`, err);
    }));

    console.log("[SystemEventService] Dedicated workers initialized (inbound, outbound, automation)");
  }

  async handleInboundEvent(event) {
    const { eventName, payload } = event;
    try {
      if (eventName === "inbound:webhook") {
        if (this.emailSyncService) {
          await this.emailSyncService.processWebhook(payload);
        } else {
          console.warn("[SystemEventService] emailSyncService not injected!");
        }
      }
    } catch (err) {
      console.error(`[SystemEventService] Failed handling inbound event ${eventName}:`, err);
    }
  }

  async handleOutboundEvent(event) {
    const { eventName, payload } = event;
    try {
      if (eventName === "outbound:send") {
        if (this.mailService && this.threadService) {
          // For phase 2, we can just process email sending here if we refactor threadService.createThread
          // Right now it's synchronous in threadService, so this is ready for that future refactor.
          console.log("[SystemEventService] Outbound job received", payload);
        }
      }
    } catch (err) {
      console.error(`[SystemEventService] Failed handling outbound event ${eventName}:`, err);
    }
  }

  async handleAutomationEvent(event) {
    const { eventName, payload } = event;

    try {
      if (eventName.startsWith("analytics:")) {
        const type = eventName.split(":")[1];
        analyticsEventBus.publish(type, payload);
      }
      else if (eventName === "automation:message.received") {
        if (this.automationEngine) {
          await this.automationEngine.handleInboundMessage(payload);
        }
      }
      else if (eventName === "automation:macro.execute") {
        if (this.automationEngine) {
          await this.automationEngine.executeMacro(payload);
        }
      }
      else if (eventName.startsWith("realtime:")) {
        const action = eventName.split(":")[1];
        if (action === "newMessage") {
          this.realtime.broadcastNewMessage(payload.channelId, payload.threadId, payload.message);
        } else if (action === "threadUpdated") {
          this.realtime.broadcastThreadUpdated(payload.channelId, payload.thread);
        } else if (action === "assignment") {
          this.realtime.broadcastAssignment(payload.channelId, payload.threadId, payload.data);
        } else if (action === "comment") {
          this.realtime.broadcastComment(payload.channelId, payload.threadId, payload.comment);
        } else if (action === "draftLock") {
          this.realtime.broadcastDraftLock(payload.channelId, payload.threadId, payload.data);
        }
      }
    } catch (err) {
      console.error(`[SystemEventService] Failed handling automation event ${eventName}:`, err);
    }
  }

  async dispatch(eventName, payload, delay = 0) {
    if (!this.connection) {
      // Fallback
      if (eventName.startsWith("inbound:")) return this.handleInboundEvent({ eventName, payload });
      if (eventName.startsWith("outbound:")) return this.handleOutboundEvent({ eventName, payload });
      return this.handleAutomationEvent({ eventName, payload });
    }
    const timestamp = Date.now();
    const event = { eventName, payload, timestamp };

    if (eventName.startsWith("inbound:")) {
      await this.inboundQueue.add(eventName, event, { delay });
    } else if (eventName.startsWith("outbound:")) {
      await this.outboundQueue.add(eventName, event, { delay, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } else {
      await this.automationQueue.add(eventName, event, { delay });
    }
  }
}

module.exports = { SystemEventService };
