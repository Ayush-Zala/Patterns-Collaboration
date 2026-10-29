function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value).trim()).filter(Boolean))];
}

async function resolveDelegationScope({ store, auth }) {
  const role = auth?.role || "sales_agent";
  const userEmail = auth?.user?.email ? String(auth.user.email).toLowerCase() : "";

  if (role === "admin") {
    return {
      mode: "admin",
      delegated: false,
      has_full_access: true,
      inbox_ids: [],
      user_email: userEmail || null,
      matched_delegation_ids: [],
    };
  }

  if (typeof store?.listDelegations !== "function" || !userEmail) {
    return {
      mode: "fallback_full",
      delegated: false,
      has_full_access: true,
      inbox_ids: [],
      user_email: userEmail || null,
      matched_delegation_ids: [],
    };
  }

  const delegations = await store.listDelegations();
  const matching = delegations.filter((delegation) =>
    (delegation.delegate_emails || []).some((email) => String(email).toLowerCase() === userEmail)
  );

  if (matching.length === 0) {
    return {
      mode: "fallback_full",
      delegated: false,
      has_full_access: true,
      inbox_ids: [],
      user_email: userEmail,
      matched_delegation_ids: [],
    };
  }

  const hasAllSections = matching.some((delegation) => delegation.permission_scope === "share_all_sections");
  if (hasAllSections) {
    return {
      mode: "delegated_all_sections",
      delegated: true,
      has_full_access: true,
      inbox_ids: [],
      user_email: userEmail,
      matched_delegation_ids: matching.map((delegation) => delegation.id),
    };
  }

  return {
    mode: "delegated_specific_inboxes",
    delegated: true,
    has_full_access: false,
    inbox_ids: uniqueStrings(matching.flatMap((delegation) => delegation.inbox_ids || [])),
    user_email: userEmail,
    matched_delegation_ids: matching.map((delegation) => delegation.id),
  };
}

async function getAccessibleInboxIds({ store, scope }) {
  if (scope.has_full_access) {
    const inboxes = typeof store?.listInboxes === "function" ? await store.listInboxes() : [];
    return uniqueStrings(inboxes.map((inbox) => inbox.id));
  }
  return uniqueStrings(scope.inbox_ids);
}

async function getAccessibleChannelIds({ store, scope }) {
  if (scope.has_full_access) {
    const channels = typeof store?.listChannels === "function" ? await store.listChannels() : [];
    return uniqueStrings(channels.map((channel) => channel.id));
  }

  const inboxIds = uniqueStrings(scope.inbox_ids);
  if (inboxIds.length === 0 || typeof store?.listInboxChannels !== "function") {
    return [];
  }

  const channelRows = await Promise.all(inboxIds.map((inboxId) => store.listInboxChannels(inboxId)));
  return uniqueStrings(channelRows.flat().map((channel) => channel.id));
}

async function canAccessInbox({ store, scope, inboxId }) {
  if (scope.has_full_access) return true;
  const allowed = await getAccessibleInboxIds({ store, scope });
  return allowed.includes(String(inboxId));
}

async function canAccessChannel({ store, scope, channelId }) {
  if (scope.has_full_access) return true;
  const allowed = await getAccessibleChannelIds({ store, scope });
  return allowed.includes(String(channelId));
}

module.exports = {
  resolveDelegationScope,
  getAccessibleInboxIds,
  getAccessibleChannelIds,
  canAccessInbox,
  canAccessChannel,
};
