const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { analyticsEventBus } = require("../analytics/analyticsEventBus");

function buildContactRoutes({ store }) {
  const router = express.Router();

  // GET /contacts
  router.get("/", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { view, query, listId, accountId } = req.query;
    let access = null;
    if (view === "shared") access = "Shared";
    if (view === "private") access = "Private";
    if (view === "auto-created") access = "Auto-created";

    const contacts = await store.listContacts({
      organizationId,
      access,
      query,
      userId: req.auth.user_id,
      listId: listId || null,
      accountId: accountId || null,
    });

    return res.status(200).json({ contacts });
  }));

  // GET /contacts/lists
  router.get("/lists", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const lists = await store.listContactLists(organizationId, req.auth.user_id);
    return res.status(200).json({ lists });
  }));

  // POST /contacts/lists
  router.post("/lists", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    const userId = req.auth.user_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { name, visibility } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const list = await store.createContactList({
      organizationId,
      name,
      visibility: visibility || "Shared",
      ownerId: userId,
    });
    return res.status(201).json({ list });
  }));

  // DELETE /contacts/lists/:id
  router.delete("/lists/:id", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    await store.deleteContactList(req.params.id);
    return res.status(200).json({ success: true });
  }));

  // GET /contacts/accounts
  router.get("/accounts", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const accounts = await store.listContactAccounts(organizationId);
    return res.status(200).json({ accounts });
  }));

  // POST /contacts/accounts
  router.post("/accounts", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { name, domain, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const account = await store.createContactAccount({
      organizationId,
      name,
      domain,
      description,
    });
    return res.status(201).json({ account });
  }));

  // DELETE /contacts/accounts/:id
  router.delete("/accounts/:id", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    await store.deleteContactAccount(req.params.id);
    return res.status(200).json({ success: true });
  }));

  // PATCH /contacts/accounts/:id
  router.patch("/accounts/:id", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { name, domain, description } = req.body;
    const account = await store.updateContactAccount(req.params.id, { name, domain, description });
    return res.status(200).json({ account });
  }));

  // POST /contacts/batch
  router.post("/batch", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    const userId = req.auth.user_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "contacts array is required" });
    }

    const created = [];
    const errors = [];

    for (const item of contacts) {
      try {
        if (!item.name) {
          errors.push({ email: item.email || "unknown", error: "Name is required" });
          continue;
        }
        if (!item.email && !item.phone && !item.x) {
          errors.push({ email: "unknown", error: "At least one of email, phone, or X handle must be provided" });
          continue;
        }

        const contact = await store.createContact({
          organizationId,
          name: item.name,
          email: item.email || null,
          phone: item.phone || null,
          x: item.x || null,
          description: item.description || null,
          access: item.access || "Shared",
          accountName: item.account || null,
          accountId: item.accountId || null,
          listId: item.listId || null,
          createdBy: userId,
        });
        created.push(contact);

        analyticsEventBus.publish("contact.created", {
          orgId: organizationId,
          contactId: contact.id,
          actorId: userId,
          access: contact.access,
        });
      } catch (error) {
        errors.push({ email: item.email || "unknown", error: error.message });
      }
    }

    return res.status(200).json({ createdCount: created.length, created, errors });
  }));

  // GET /contacts/:id
  router.get("/:id", asyncHandler(async (req, res) => {
    const contact = await store.getContact(req.params.id);
    if (!contact || contact.organizationId !== req.auth.organization_id) {
      return res.status(404).json({ error: "Contact not found" });
    }
    if (contact.access === "Private" && contact.createdBy !== req.auth.user_id) {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.status(200).json({ contact });
  }));

  // POST /contacts
  router.post("/", asyncHandler(async (req, res) => {
    const organizationId = req.auth.organization_id;
    const userId = req.auth.user_id;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization context required" });
    }

    const { name, email, phone, x, description, access, accountName, accountDomain, accountId, listId } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email && !phone && !x) {
      return res.status(400).json({ error: "At least one of email, phone, or X handle must be provided" });
    }

    try {
      const contact = await store.createContact({
        organizationId,
        name,
        email,
        phone,
        x,
        description,
        access: access || "Shared",
        accountId,
        listId,
        accountName,
        accountDomain,
        createdBy: userId,
      });

      analyticsEventBus.publish("contact.created", {
        orgId: organizationId,
        contactId: contact.id,
        actorId: userId,
        access: contact.access,
      });

      return res.status(201).json({ contact });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "A contact with this email already exists." });
      }
      throw error;
    }
  }));

  // PATCH /contacts/:id
  router.patch("/:id", asyncHandler(async (req, res) => {
    const contact = await store.getContact(req.params.id);
    if (!contact || contact.organizationId !== req.auth.organization_id) {
      return res.status(404).json({ error: "Contact not found" });
    }
    if (contact.access === "Private" && contact.createdBy !== req.auth.user_id) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const organizationId = req.auth.organization_id;
    const { name, email, phone, x, description, access, accountName, accountDomain, accountId, listId } = req.body;

    try {
      const updated = await store.updateContact(req.params.id, {
        organizationId,
        name,
        email,
        phone,
        x,
        description,
        access,
        accountName,
        accountDomain,
        accountId,
        listId,
      });

      return res.status(200).json({ contact: updated });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "A contact with this email already exists." });
      }
      throw error;
    }
  }));

  // DELETE /contacts/:id
  router.delete("/:id", asyncHandler(async (req, res) => {
    const contact = await store.getContact(req.params.id);
    if (!contact || contact.organizationId !== req.auth.organization_id) {
      return res.status(404).json({ error: "Contact not found" });
    }
    if (contact.access === "Private" && contact.createdBy !== req.auth.user_id) {
      return res.status(404).json({ error: "Contact not found" });
    }

    await store.deleteContact(req.params.id);
    return res.status(200).json({ success: true });
  }));

  return router;
}

module.exports = { buildContactRoutes };
