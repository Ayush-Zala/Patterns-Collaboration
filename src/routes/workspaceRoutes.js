const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildWorkspaceRoutes({ store }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (req, res) => {
    const workspaces = await store.listWorkspaces();
    return res.status(200).json({ workspaces });
  }));

  router.get("/:id", asyncHandler(async (req, res) => {
    const workspace = await store.getWorkspace(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    return res.status(200).json({ workspace });
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can edit workspaces" });
    }
    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const workspace = await store.updateWorkspace(req.params.id, { name: String(name).trim(), color });
    return res.status(200).json({ workspace });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can create workspaces" });
    }

    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const workspace = await store.createWorkspace({
      organizationId: req.auth.organization_id || "global",
      name: String(name).trim(),
      color: color || "#6366f1",
    });

    return res.status(201).json({ workspace });
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete workspaces" });
    }

    try {
      await store.deleteWorkspace(req.params.id);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }));

  return router;
}

module.exports = { buildWorkspaceRoutes };
