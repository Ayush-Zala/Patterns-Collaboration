const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildCustomFieldRoutes({ store }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (req, res) => {
    const fields = await store.listCustomFields();
    return res.status(200).json({ custom_fields: fields });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can create custom fields" });
    }

    const { name, description, type, model } = req.body;
    if (!name || !type || !model) {
      return res.status(400).json({ error: "name, type and model are required" });
    }

    const field = await store.createCustomField({
      organizationId: req.auth.organization_id || "global",
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      type: String(type).trim(),
      model: String(model).trim(),
    });

    return res.status(201).json({ custom_field: field });
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete custom fields" });
    }

    await store.deleteCustomField(req.params.id);
    return res.status(200).json({ success: true });
  }));

  return router;
}

module.exports = { buildCustomFieldRoutes };
