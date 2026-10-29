const express = require("express");

function buildTeammateGroupRoutes(deps) {
  const router = express.Router();
  const { store } = deps;

  // Middleware to ensure user is authenticated and org context is present
  router.use((req, _res, next) => {
    const orgId = req.headers["x-org-id"];
    console.log(`[TeammateGroupRoutes] Auth check: userId=${req.auth?.user_id}, orgId=${orgId}`);
    
    if (!req.auth?.user_id || !orgId) {
      console.warn(`[TeammateGroupRoutes] Unauthorized: userId=${req.auth?.user_id}, orgId=${orgId}`);
      return _res.status(401).json({ error: "Unauthorized or missing organization context" });
    }
    req.orgId = orgId;
    next();
  });

  router.get("/", async (req, res) => {
    try {
      const groups = await store.listTeammateGroups(req.orgId);
      res.json(groups);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to list teammate groups" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const group = await store.createTeammateGroup({
        organizationId: req.orgId,
        name: req.body.name,
        description: req.body.description,
        workspaceAccess: req.body.workspaceAccess,
        contactsAccessEnabled: req.body.contactsAccessEnabled,
        canEditGroup: req.body.canEditGroup,
        canDeleteGroup: req.body.canDeleteGroup,
        members: req.body.members || []
      });
      res.status(201).json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create teammate group" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const group = await store.getTeammateGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      res.json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get teammate group" });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const group = await store.updateTeammateGroup(req.params.id, req.body);
      res.json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update teammate group" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      await store.deleteTeammateGroup(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete teammate group" });
    }
  });

  router.get("/settings", async (req, res) => {
    try {
      const settings = await store.getTeammateGroupSettings(req.orgId);
      res.json(settings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get teammate group settings" });
    }
  });

  router.put("/settings", async (req, res) => {
    try {
      const settings = await store.updateTeammateGroupSettings(req.orgId, req.body);
      res.json(settings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update teammate group settings" });
    }
  });

  return router;
}

module.exports = { buildTeammateGroupRoutes };
