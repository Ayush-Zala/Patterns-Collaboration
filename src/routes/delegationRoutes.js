const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { getAccessibleChannelIds, getAccessibleInboxIds, resolveDelegationScope } = require("../services/delegationAccess");

const VALID_SCOPES = new Set(["share_all_sections", "share_specific_inboxes"]);

function normalizeEmails(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildDelegationRoutes({ store }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (req, res) => {
    const delegationRows = await store.listDelegations();
    const userEmail = req.auth.user?.email ? String(req.auth.user.email).toLowerCase() : "";
    const visibleRows = req.auth.role === "admin"
      ? delegationRows
      : delegationRows.filter((delegation) =>
        (delegation.delegate_emails || []).some((email) => String(email).toLowerCase() === userEmail)
      );

    const delegations = await Promise.all(visibleRows.map(async (delegation) => ({
      ...delegation,
      inboxes: (await Promise.all(delegation.inbox_ids.map((inboxId) => store.getInbox(inboxId)))).filter(Boolean),
    })));
    return res.status(200).json({ delegations });
  }));

  router.get("/me/scope", asyncHandler(async (req, res) => {
    const scope = await resolveDelegationScope({ store, auth: req.auth });
    const inboxIds = await getAccessibleInboxIds({ store, scope });
    const inboxes = (await Promise.all(inboxIds.map((inboxId) => store.getInbox(inboxId)))).filter(Boolean);
    const channelIds = await getAccessibleChannelIds({ store, scope });

    return res.status(200).json({
      scope: {
        ...scope,
        inbox_ids: inboxIds,
        channel_ids: channelIds,
      },
      inboxes,
    });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can create delegations" });
    }

    const name = req.body.name ? String(req.body.name).trim() : "";
    const permissionScope = String(req.body.permission_scope || "");
    const inboxIds = Array.isArray(req.body.inbox_ids)
      ? [...new Set(req.body.inbox_ids.map((id) => String(id).trim()).filter(Boolean))]
      : [];
    const delegateEmails = normalizeEmails(req.body.delegate_emails);

    if (!VALID_SCOPES.has(permissionScope)) {
      return res.status(400).json({
        error: "permission_scope must be share_all_sections or share_specific_inboxes",
      });
    }
    if (delegateEmails.length === 0) {
      return res.status(400).json({ error: "At least one delegate email is required." });
    }
    if (delegateEmails.some((email) => !isValidEmail(email))) {
      return res.status(400).json({ error: "One or more delegate emails are invalid." });
    }

    if (permissionScope === "share_specific_inboxes") {
      if (inboxIds.length === 0) {
        return res.status(400).json({ error: "Select at least one inbox for specific sharing." });
      }
      const inboxRows = await Promise.all(inboxIds.map((id) => store.getInbox(id)));
      const hasInvalidInbox = inboxRows.some((row) => !row);
      if (hasInvalidInbox) {
        return res.status(400).json({ error: "One or more inbox_ids are invalid." });
      }
    }

    const delegation = await store.createDelegation({
      name: name || `Delegation for ${delegateEmails[0]}`,
      permission_scope: permissionScope,
      inbox_ids: permissionScope === "share_all_sections" ? [] : inboxIds,
      delegate_emails: delegateEmails,
      created_by: req.auth.user_id,
    });

    const inboxes = (await Promise.all(delegation.inbox_ids.map((inboxId) => store.getInbox(inboxId)))).filter(Boolean);

    return res.status(201).json({
      delegation: {
        ...delegation,
        inboxes,
      },
    });
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete delegations" });
    }
    if (typeof store.deleteDelegation !== "function") {
      return res.status(500).json({ error: "Delegation delete is not available for current store mode." });
    }

    const deleted = await store.deleteDelegation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Delegation not found." });
    }

    return res.status(200).json({ delegation: deleted });
  }));

  return router;
}

module.exports = { buildDelegationRoutes };
