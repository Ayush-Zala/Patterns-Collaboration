const express = require("express");

function buildTicketingRoutes(deps) {
  const router = express.Router();
  const { store } = deps;

  // Middleware to ensure user is authenticated and org context is present
  router.use((req, res, next) => {
    const orgId = req.headers["x-org-id"];
    if (!req.auth?.user_id || !orgId) {
      return res.status(401).json({ error: "Unauthorized or missing organization context" });
    }
    req.orgId = orgId;
    next();
  });

  // --- Statuses ---

  router.get("/statuses", async (req, res) => {
    try {
      const statuses = await store.listTicketStatuses(req.orgId);
      res.json(statuses);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to list ticket statuses" });
    }
  });

  router.post("/statuses", async (req, res) => {
    try {
      const status = await store.createTicketStatus({
        ...req.body,
        organizationId: req.orgId
      });
      res.status(201).json(status);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create ticket status" });
    }
  });

  router.delete("/statuses/:id", async (req, res) => {
    try {
      await store.deleteTicketStatus(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete ticket status" });
    }
  });

  // --- Groups ---

  router.get("/groups", async (req, res) => {
    try {
      const groups = await store.listTicketStatusGroups(req.orgId);
      res.json(groups);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to list ticket status groups" });
    }
  });

  router.get("/groups/:id", async (req, res) => {
    try {
      const group = await store.getTicketStatusGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      res.json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get ticket status group" });
    }
  });

  router.post("/groups", async (req, res) => {
    try {
      const group = await store.createTicketStatusGroup({
        ...req.body,
        organizationId: req.orgId
      });
      res.status(201).json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create ticket status group" });
    }
  });

  router.put("/groups/:id", async (req, res) => {
    try {
      const group = await store.updateTicketStatusGroup(req.params.id, req.body);
      res.json(group);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update ticket status group" });
    }
  });

  router.delete("/groups/:id", async (req, res) => {
    try {
      await store.deleteTicketStatusGroup(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete ticket status group" });
    }
  });

  return router;
}

module.exports = { buildTicketingRoutes };
