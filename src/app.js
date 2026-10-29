const express = require("express");
const cors = require("cors");

const { authContext } = require("./middleware/authContext");
const { buildAuthRoutes } = require("./routes/authRoutes");
const { buildInboxRoutes } = require("./routes/inboxRoutes");
const { buildChannelRoutes } = require("./routes/channelRoutes");
const { buildTemplateRoutes } = require("./routes/templateRoutes");
const { buildDelegationRoutes } = require("./routes/delegationRoutes");
const { buildSignatureRoutes } = require("./routes/signatureRoutes");
const { buildThreadRoutes } = require("./routes/threadRoutes");
const { buildCommentRoutes } = require("./routes/commentRoutes");
const { buildWebhookRoutes } = require("./routes/webhookRoutes");
const { buildActivityRoutes } = require("./routes/activityRoutes");
const { buildRuleRoutes } = require("./routes/ruleRoutes");
const { buildUserSettingsRoutes } = require("./routes/userSettingsRoutes");
const { buildTeammateGroupRoutes } = require("./routes/teammateGroupRoutes");
const { buildTicketingRoutes } = require("./routes/ticketingRoutes");
const { buildTagRoutes } = require("./routes/tagRoutes");
const { buildCustomFieldRoutes } = require("./routes/customFieldRoutes");
const { buildWorkspaceRoutes } = require("./routes/workspaceRoutes");
const { buildViewRoutes } = require("./routes/viewRoutes");
const { buildCalendarRoutes } = require("./routes/calendarRoutes");
const { buildContactRoutes } = require("./routes/contactRoutes");
const { buildAnalyticsRoutes } = require("./routes/analyticsRoutes");
const { buildSequenceRoutes } = require("./routes/sequenceRoutes");



function buildApp(deps) {
  const { scopeMiddleware } = require("./middleware/scope.middleware");

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use((req, _res, next) => {
    console.log(`[App] ${req.method} ${req.url}`);
    next();
  });
  app.use(authContext(deps.store));
  app.use(scopeMiddleware());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/auth", buildAuthRoutes({ authService: deps.authService, mailService: deps.mailService, store: deps.store }));
  app.use("/inboxes", buildInboxRoutes({ store: deps.store, realtime: deps.realtime }));
  app.use(
    "/channels",
    buildChannelRoutes({
      store: deps.store,
      authService: deps.authService,
      emailSyncService: deps.emailSyncService,
    })
  );
  app.use("/message-templates", buildTemplateRoutes({ store: deps.store }));
  app.use("/delegations", buildDelegationRoutes({ store: deps.store }));
  app.use("/signatures", buildSignatureRoutes({ store: deps.store }));
  app.use(
    "/threads",
    buildThreadRoutes({
      store: deps.store,
      threadService: deps.threadService,
      draftLockManager: deps.draftLockManager,
      lockTtlSeconds: deps.lockTtlSeconds,
    })
  );
  app.use("/comments", buildCommentRoutes({ store: deps.store, threadService: deps.threadService }));
  app.use("/webhooks", buildWebhookRoutes({ systemEvents: deps.systemEvents }));
  app.use("/activity", buildActivityRoutes({ store: deps.store }));
  app.use("/rules", buildRuleRoutes({ store: deps.store }));
  app.use("/user-settings", buildUserSettingsRoutes({ store: deps.store }));
  app.use("/teammate-groups", buildTeammateGroupRoutes({ store: deps.store }));
  app.use("/ticketing", buildTicketingRoutes({ store: deps.store }));
  app.use("/tags", buildTagRoutes({ store: deps.store }));
  app.use("/custom-fields", buildCustomFieldRoutes({ store: deps.store }));
  app.use("/workspaces", buildWorkspaceRoutes({ store: deps.store }));
  app.use("/views", buildViewRoutes({ store: deps.store }));
  app.use("/calendar", buildCalendarRoutes({ store: deps.store, calendarService: deps.calendarService }));
  app.use("/contacts", buildContactRoutes({ store: deps.store }));
  app.use("/analytics-v2", buildAnalyticsRoutes());
  app.use("/sequences", buildSequenceRoutes({ store: deps.store }));


  app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { buildApp };
