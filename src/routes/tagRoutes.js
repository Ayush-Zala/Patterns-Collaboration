const express = require("express");

function buildTagRoutes(deps) {
  const router = express.Router();
  const { store } = deps;

  // Middleware to ensure user is authenticated
  router.use((req, res, next) => {
    if (!req.auth?.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.scopeType = req.headers["x-scope-type"] || "company";
    req.scopeId = req.headers["x-scope-id"] || "global";
    req.orgId = req.headers["x-org-id"] || req.scopeId;
    next();
  });

  router.get("/", async (req, res) => {
    try {
      const tags = await store.listTags(req.orgId, req.scopeType, req.scopeId);
      res.json(tags);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to list tags" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const tag = await store.createTag({
        ...req.body,
        organizationId: req.orgId || "global",
        scopeType: req.scopeType,
        scopeId: req.scopeId
      });
      res.status(201).json(tag);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const tag = await store.updateTag(req.params.id, req.body);
      res.json(tag);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      await store.deleteTag(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  router.post("/bulk", async (req, res) => {
    try {
      const { ids, patch } = req.body;
      await store.bulkUpdateTags(ids, patch);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to bulk update tags" });
    }
  });

  return router;
}

module.exports = { buildTagRoutes };
