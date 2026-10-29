const express = require("express");

function buildViewRoutes(deps) {
  const router = express.Router();
  const { store } = deps;

  // Require auth + org context on all routes
  router.use((req, res, next) => {
    const orgId = req.headers["x-org-id"];
    if (!req.auth?.user_id || !orgId) {
      return res.status(401).json({ error: "Unauthorized or missing organization context" });
    }
    req.orgId = orgId;
    req.userId = req.auth.user_id;
    next();
  });

  // GET /views — list all views for the org
  router.get("/", async (req, res) => {
    try {
      const views = await store.listViews(req.orgId);
      res.json(views);
    } catch (err) {
      console.error("[ViewRoutes] listViews error:", err);
      res.status(500).json({ error: "Failed to list views" });
    }
  });

  // GET /views/:id — get a single view
  router.get("/:id", async (req, res) => {
    try {
      const view = await store.getView(req.params.id);
      if (!view) return res.status(404).json({ error: "View not found" });
      res.json(view);
    } catch (err) {
      console.error("[ViewRoutes] getView error:", err);
      res.status(500).json({ error: "Failed to get view" });
    }
  });

  // POST /views — create a new view
  router.post("/", async (req, res) => {
    try {
      const { name, color, emoji, inboxIds, includeTags, excludeTags, assigneeIds, teammateIds } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      if (!Array.isArray(inboxIds) || inboxIds.length === 0) {
        return res.status(400).json({ error: "At least one inbox is required" });
      }
      const view = await store.createView({
        organizationId: req.orgId,
        name,
        color: color || null,
        emoji: emoji || null,
        inboxIds,
        includeTags: includeTags || [],
        excludeTags: excludeTags || [],
        assigneeIds: assigneeIds || [],
        teammateIds: teammateIds || [],
        createdBy: req.userId,
      });
      res.status(201).json(view);
    } catch (err) {
      console.error("[ViewRoutes] createView error:", err);
      res.status(500).json({ error: "Failed to create view" });
    }
  });

  // PUT /views/:id — update an existing view
  router.put("/:id", async (req, res) => {
    try {
      const existing = await store.getView(req.params.id);
      if (!existing) return res.status(404).json({ error: "View not found" });
      const { name, color, emoji, inboxIds, includeTags, excludeTags, assigneeIds, teammateIds } = req.body;
      const view = await store.updateView(req.params.id, {
        name,
        color,
        emoji,
        inboxIds,
        includeTags,
        excludeTags,
        assigneeIds,
        teammateIds,
      });
      res.json(view);
    } catch (err) {
      console.error("[ViewRoutes] updateView error:", err);
      res.status(500).json({ error: "Failed to update view" });
    }
  });

  // DELETE /views/:id — delete a view
  router.delete("/:id", async (req, res) => {
    try {
      const existing = await store.getView(req.params.id);
      if (!existing) return res.status(404).json({ error: "View not found" });
      await store.deleteView(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error("[ViewRoutes] deleteView error:", err);
      res.status(500).json({ error: "Failed to delete view" });
    }
  });

  return router;
}

module.exports = { buildViewRoutes };
