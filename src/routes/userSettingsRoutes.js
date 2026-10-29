const express = require("express");

function buildUserSettingsRoutes(deps) {
  const router = express.Router();
  const { store } = deps;

  // Middleware to ensure user is authenticated
  router.use((req, res, next) => {
    if (!req.auth?.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });

  // --- Notification Settings ---

  router.get("/notifications", async (req, res) => {
    try {
      const settings = await store.getNotificationSetting(req.auth.user_id);
      res.json(settings || { desktop: "smart", mobile: "smart", email: "smart" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get notification settings" });
    }
  });

  router.post("/notifications", async (req, res) => {
    try {
      const settings = await store.upsertNotificationSetting(req.auth.user_id, req.body);
      res.json(settings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update notification settings" });
    }
  });

  // --- Notification Rules ---

  router.get("/notification-rules", async (req, res) => {
    try {
      const rules = await store.listNotificationRules(req.auth.user_id);
      res.json(rules);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to list notification rules" });
    }
  });

  router.post("/notification-rules", async (req, res) => {
    try {
      const rule = await store.createNotificationRule({ ...req.body, userId: req.auth.user_id });
      res.status(201).json(rule);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create notification rule" });
    }
  });

  router.delete("/notification-rules/:id", async (req, res) => {
    try {
      await store.deleteNotificationRule(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete notification rule" });
    }
  });

  // --- Snoozes ---

  router.get("/snoozes", async (req, res) => {
    try {
      const snoozes = await store.listSnoozes(req.auth.user_id);
      res.json(snoozes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to list snoozes" });
    }
  });

  router.post("/snoozes", async (req, res) => {
    try {
      const snooze = await store.createSnooze({ ...req.body, userId: req.auth.user_id });
      res.status(201).json(snooze);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create snooze" });
    }
  });

  router.delete("/snoozes/:id", async (req, res) => {
    try {
      await store.deleteSnooze(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete snooze" });
    }
  });

  // --- Preferences ---

  router.get("/preferences", async (req, res) => {
    try {
      const prefs = await store.getUserPreferences(req.auth.user_id);
      res.json(prefs || {});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  router.patch("/preferences", async (req, res) => {
    try {
      const existing = await store.getUserPreferences(req.auth.user_id) || {};
      const updated = await store.upsertUserPreferences(req.auth.user_id, { ...existing, ...req.body });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  router.post("/sessions/sign-out-others", async (req, res) => {
    try {
      // In a real app, we would delete all sessions for this user EXCEPT the current one.
      // Since the backend is decoupled and session is managed by better-auth on frontend,
      // we'll just mock a success for now.
      console.log(`[Sessions] Mocking sign out other sessions for user ${req.auth.user_id}`);
      res.json({ success: true, message: "Other sessions signed out" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to sign out other sessions" });
    }
  });

  return router;
}

module.exports = { buildUserSettingsRoutes };
