const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildTemplateRoutes({ store }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (_req, res) => {
    const templatesRaw = await store.listMessageTemplates();
    const templates = await Promise.all(templatesRaw.map(async (template) => ({
      ...template,
      folder: await store.getTemplateFolder(template.folder_id),
    })));
    const folders = await store.listTemplateFolders();
    return res.status(200).json({ templates, folders });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can create templates" });
    }

    const { name, subject, folder_id } = req.body;
    if (!name || !subject || !folder_id) {
      return res.status(400).json({ error: "name, subject and folder_id are required" });
    }
    const folder = await store.getTemplateFolder(folder_id);
    if (!folder) {
      return res.status(400).json({ error: "Invalid folder_id" });
    }

    const template = await store.createMessageTemplate({
      name: String(name).trim(),
      subject: String(subject).trim(),
      folder_id,
      created_by: req.auth.user_id,
    });

    return res.status(201).json({ template: { ...template, folder } });
  }));

  return router;
}

module.exports = { buildTemplateRoutes };
