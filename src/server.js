const http = require("http");
const { createClient } = require("redis");
const { Server } = require("socket.io");

const config = require("./config");
const { buildApp } = require("./app");
const { InMemoryStore } = require("./data/store");
const { DatabaseStore } = require("./data/databaseStore");
const { DraftLockManager } = require("./services/draftLockManager");
const { AuthService } = require("./services/authService");
const { ThreadService } = require("./services/threadService");
const { EmailSyncService } = require("./services/emailSyncService");
const { RealtimeGateway } = require("./realtime/realtimeGateway");
const { MailService } = require("./services/mailService");
const { CalendarService } = require("./services/calendarService");
const { AnalyticsAggregator } = require("./analytics/analyticsAggregator");
const { SequenceWorker } = require("./workers/sequenceWorker");
const { AutomationEngineService } = require("./services/automationEngineService");


async function setupRedisClient() {
  if (!config.redisUrl) return null;
  const client = createClient({ url: config.redisUrl });
  client.on("error", (err) => {
    console.warn("Redis client error:", err.message);
  });

  try {
    await client.connect();
    console.log("Redis connected");
    return client;
  } catch (err) {
    console.warn("Redis unavailable; using in-memory draft/lock manager");
    return null;
  }
}

async function bootstrap() {
  if (config.storeMode === "database" && !config.databaseUrl) {
    throw new Error("STORE_MODE=database requires DATABASE_URL to be configured.");
  }

  const store =
    config.storeMode === "database"
      ? new DatabaseStore()
      : new InMemoryStore();

  if (typeof store.init === "function") {
    await store.init({ seed: config.databaseSeedOnBoot });
  }

  const redisClient = await setupRedisClient();
  const draftLockManager = new DraftLockManager({
    redisClient,
    defaultLockTtlSeconds: config.lockTtlSeconds,
  });

  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  const realtime = new RealtimeGateway(io, store);
  const automationEngine = new AutomationEngineService({ store });
  const { SystemEventService } = require("./services/systemEventService");
  const systemEvents = new SystemEventService({ realtime, automationEngine });
  systemEvents.init();

  const authService = new AuthService({ store });
  const mailService = new MailService();
  const calendarService = new CalendarService({ authService });
  const threadService = new ThreadService({ store, draftLockManager, realtime, authService, mailService, systemEvents });
  const emailSyncService = new EmailSyncService({ threadService, store, authService });
  // Wire services into SystemEventService for queue workers
  systemEvents.setServices({ threadService, emailSyncService, mailService });

  const app = buildApp({
    store,
    authService,
    threadService,
    emailSyncService,
    mailService,
    calendarService,
    draftLockManager,
    lockTtlSeconds: config.lockTtlSeconds,
    systemEvents,
  });

  httpServer.on("request", app);
  realtime.install();

  // Start analytics aggregator — listens to event bus and materialises metrics
  new AnalyticsAggregator({ realtime });

  // Start Background Sequence Worker
  const sequenceWorker = new SequenceWorker({ store, authService, mailService });
  if (config.storeMode === "database") {
    sequenceWorker.start();
  }

  httpServer.listen(config.port, () => {
    console.log(`Shared Inbox prototype running on port ${config.port}`);
    console.log(`Store mode: ${config.storeMode}`);
    console.log("Seed users: u-sales-1, u-lead-1, u-admin-1");
  });

  const gracefulShutdown = async () => {
    try {
      if (sequenceWorker) sequenceWorker.stop();
      await redisClient?.quit?.();
      if (typeof store.close === "function") {
        await store.close();
      }
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

bootstrap();
