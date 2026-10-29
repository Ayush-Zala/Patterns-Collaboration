export type PermissionModuleId =
  | "admin_permission_set"
  | "conversations"
  | "teammates"
  | "permissions"
  | "shifts"
  | "inboxes"
  | "message_templates"
  | "signatures"
  | "rules";

export type PermissionAction = {
  id: string;
  label: string;
};

export type PermissionModule = {
  id: PermissionModuleId;
  title: string;
  description?: string;
  icon: string;
  actions: PermissionAction[];
};

export type PermissionAssignments = Record<string, string[]>;

export const PERMISSIONS_STORAGE_KEY = "patterns-shared-inbox:permission-assignments";

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "admin_permission_set",
    title: "Admin permission set",
    description: "Members of the selected teammate groups will have all permissions in this workspace",
    icon: "shield",
    actions: [{ id: "workspace_admin_set", label: "Workspace admin set" }],
  },
  {
    id: "conversations",
    title: "Conversations",
    icon: "mail",
    actions: [
      { id: "assign", label: "Assign" },
      { id: "archive", label: "Archive" },
      { id: "block_senders", label: "Block senders" },
      { id: "delete_and_mark_as_spam", label: "Delete and mark as spam" },
      { id: "move", label: "Move" },
      { id: "permanently_delete", label: "Permanently delete conversations and messages" },
      { id: "send_messages", label: "Send messages" },
      { id: "send_comments", label: "Send comments" },
    ],
  },
  {
    id: "teammates",
    title: "Teammates",
    icon: "users",
    actions: [{ id: "manage", label: "Manage" }],
  },
  {
    id: "permissions",
    title: "Permissions",
    icon: "user_lock",
    actions: [{ id: "manage", label: "Manage" }],
  },
  {
    id: "shifts",
    title: "Shifts",
    icon: "calendar",
    actions: [
      { id: "create_edit", label: "Create and edit" },
      { id: "delete", label: "Delete" },
    ],
  },
  {
    id: "inboxes",
    title: "Inboxes",
    icon: "inbox",
    actions: [{ id: "create_edit_delete", label: "Create, edit and delete" }],
  },
  {
    id: "message_templates",
    title: "Templates",
    icon: "file",
    actions: [
      { id: "create_edit", label: "Create and edit" },
      { id: "delete", label: "Delete" },
    ],
  },
  {
    id: "signatures",
    title: "Signatures",
    icon: "pen",
    actions: [
      { id: "create_edit", label: "Create and edit" },
      { id: "delete", label: "Delete" },
    ],
  },
  {
    id: "rules",
    title: "Rules",
    icon: "gear",
    actions: [
      { id: "create_edit", label: "Create and edit" },
      { id: "delete", label: "Delete" },
    ],
  },
];

export function createPermissionAssignments(defaultGroupId = "workspace_admins"): PermissionAssignments {
  const entries: PermissionAssignments = {};

  for (const permissionModule of PERMISSION_MODULES) {
    for (const action of permissionModule.actions) {
      entries[`${permissionModule.id}:${action.id}`] = [defaultGroupId];
    }
  }

  return entries;
}

export function readPermissionAssignments(defaultGroupId = "workspace_admins"): PermissionAssignments {
  if (typeof window === "undefined") {
    return createPermissionAssignments(defaultGroupId);
  }

  try {
    const raw = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return createPermissionAssignments(defaultGroupId);
    const parsed = JSON.parse(raw) as PermissionAssignments;
    if (!parsed || typeof parsed !== "object") {
      return createPermissionAssignments(defaultGroupId);
    }

    const defaults = createPermissionAssignments(defaultGroupId);
    for (const key of Object.keys(defaults)) {
      const value = parsed[key];
      defaults[key] = Array.isArray(value) ? value.filter((item) => typeof item === "string") : defaults[key];
    }

    return defaults;
  } catch {
    return createPermissionAssignments(defaultGroupId);
  }
}

export function writePermissionAssignments(assignments: PermissionAssignments) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(assignments));
}
