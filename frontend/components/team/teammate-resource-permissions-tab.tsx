"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Users, UserCog, Calendar, Inbox, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const GROUPS = [
  {
    id: "conversations",
    label: "Conversations",
    icon: Mail,
    items: [
      { id: "c_assign", label: "Assign" },
      { id: "c_archive", label: "Archive" },
      { id: "c_block", label: "Block senders" },
      { id: "c_delete_spam", label: "Delete and mark as spam" },
      { id: "c_move", label: "Move" },
      { id: "c_perm_delete", label: "Permanently delete conversations and messages" },
      { id: "c_send_msg", label: "Send messages" },
      { id: "c_send_comment", label: "Send comments" },
    ]
  },
  {
    id: "teammates",
    label: "Teammates",
    icon: Users,
    items: [
      { id: "t_manage", label: "Manage" }
    ]
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: UserCog,
    items: [
      { id: "p_manage", label: "Manage" }
    ]
  },
  {
    id: "shifts",
    label: "Shifts",
    icon: Calendar,
    items: [
      { id: "s_create", label: "Create and edit" },
      { id: "s_delete", label: "Delete" }
    ]
  },
  {
    id: "inboxes",
    label: "Inboxes",
    icon: Inbox,
    items: [
      { id: "i_create", label: "Create, edit and delete" }
    ]
  }
];

export function TeammateResourcePermissionsTab({ permissions }: { permissions: Record<string, boolean> }) {
  const [state, setState] = useState<Record<string, boolean>>(permissions || {});
  const [isSaving, setIsSaving] = useState(false);

  const togglePermission = (id: string, checked: boolean) => {
    setState(prev => ({ ...prev, [id]: checked }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-end">
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-white text-black hover:bg-zinc-200"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
      <div className="max-w-2xl">
        {GROUPS.map((group, index) => (
          <div key={group.id} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <group.icon className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground tracking-tight">{group.label}</h3>
            </div>
            <div className="space-y-4 pl-7">
              {group.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox 
                    id={item.id}
                    checked={state[item.id] ?? true} 
                    onCheckedChange={(c) => togglePermission(item.id, c === true)}
                    className="border-border data-[state=checked]:bg-[#6b5eed] data-[state=checked]:border-[#6b5eed]"
                  />
                  <label 
                    htmlFor={item.id} 
                    className="text-sm text-muted-foreground font-medium cursor-pointer select-none"
                  >
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
            {index < GROUPS.length - 1 && (
              <div className="mt-8 border-b border-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
