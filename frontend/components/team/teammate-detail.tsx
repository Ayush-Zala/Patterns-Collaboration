"use client";

import { useState } from "react";
import { 
  User, 
  Database, 
  Inbox, 
  Mail, 
  Users, 
  Shield, 
  Workflow, 
  Settings, 
  Clock, 
  Calendar, 
  Signature, 
  Bell, 
  Moon, 
  Key,
  ChevronRight,
  ArrowLeft,
  LayoutGrid,
  Zap,
  Lock
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { TeammateOverviewTab } from "./teammate-overview-tab";
import { TeammateInboxesTab } from "./teammate-inboxes-tab";
import { TeammateChannelsTab } from "./teammate-channels-tab";
import { TeammateGroupsTab } from "./teammate-groups-tab";
import { TeammateSharedInboxesTab } from "./teammate-shared-inboxes-tab";
import { TeammateResourcePermissionsTab } from "./teammate-resource-permissions-tab";
import { TeammateRulesTab } from "./teammate-rules-tab";
import { TeammateMessageTemplatesTab } from "./teammate-message-templates-tab";
import { TeammateTimeOffTab } from "./teammate-time-off-tab";
import { TeammateShiftsTab } from "./teammate-shifts-tab";
import { TeammateSignaturesTab } from "./teammate-signatures-tab";
import { TeammateNotificationsTab } from "./teammate-notifications-tab";
import { TeammateSnoozesTab } from "./teammate-snoozes-tab";
import { Teammate2FATab } from "./teammate-2fa-tab";

interface TeammateDetailProps {
  teammateId: string;
}

const TABS = [
  { id: "overview", label: "Overview", icon: User },
  { id: "custom-fields", label: "Custom fields", icon: Database },
  { id: "individual-inboxes", label: "Individual inboxes", icon: Inbox },
  { id: "channels", label: "Channels", icon: Mail },
  { id: "teammate-groups", label: "Teammate groups", icon: Users },
  { id: "shared-inboxes", label: "Shared inboxes", icon: LayoutGrid },
  { id: "resource-permissions", label: "Resource permissions", icon: Shield },
  { id: "rules", label: "Rules", icon: Workflow },
  { id: "preferences", label: "Preferences", icon: Settings },
  { id: "message-templates", label: "Message templates", icon: Mail },
  { id: "time-off", label: "Time off", icon: Clock },
  { id: "shifts", label: "Shifts", icon: Calendar },
  { id: "signatures", label: "Signatures", icon: Signature },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "snoozes", label: "Snoozes", icon: Moon },
  { id: "2fa", label: "Two-factor auth", icon: Key },
];

export function TeammateDetail({ teammateId }: TeammateDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [resources, setResources] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      try {
        const res = await fetch(`/api/settings/users/${teammateId}/resources`);
        if (res.ok) {
          const data = await res.json();
          setResources(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResources();
  }, [teammateId]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading teammate...</div>
      </div>
    );
  }

  if (!resources?.user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Teammate not found.</div>
      </div>
    );
  }

  const user = resources.user;
  const initials = user.firstName && user.lastName 
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() 
    : user.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-500 overflow-hidden">
      {/* Top Header & Horizontal Navigation */}
      <div className="flex flex-col border-b border-border bg-background pt-6 px-8">
        <div className="flex items-center gap-4 mb-8 mt-2">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground hover:bg-white/5 h-8 w-8 p-0 rounded-md shrink-0">
            <Link href="/settings/teammates">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-xl bg-[#f85c5c] text-white flex items-center justify-center text-2xl font-bold shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{user.name}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-[13px] font-medium transition-all whitespace-nowrap border-b-2",
                activeTab === tab.id
                  ? "text-white border-white"
                  : "text-muted-foreground border-transparent hover:text-muted-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="w-full max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "overview" && <TeammateOverviewTab user={user} />}
          {activeTab === "individual-inboxes" && <TeammateInboxesTab inboxes={resources.inboxes} />}
          {activeTab === "channels" && <TeammateChannelsTab channels={resources.channels} />}
          {activeTab === "teammate-groups" && <TeammateGroupsTab groups={resources.groups} />}
          {activeTab === "shared-inboxes" && <TeammateSharedInboxesTab inboxes={resources.sharedInboxes || []} />}
          {activeTab === "resource-permissions" && <TeammateResourcePermissionsTab permissions={resources.resourcePermissions || {}} />}
          {activeTab === "rules" && <TeammateRulesTab rules={resources.rules || []} />}
          {activeTab === "message-templates" && <TeammateMessageTemplatesTab templates={resources.messageTemplates || []} />}
          {activeTab === "time-off" && <TeammateTimeOffTab timeOff={resources.timeOff || []} />}
          {activeTab === "shifts" && <TeammateShiftsTab shifts={resources.shifts || []} />}
          {activeTab === "signatures" && <TeammateSignaturesTab signatures={resources.signatures || []} />}
          {activeTab === "notifications" && <TeammateNotificationsTab notifications={resources.notifications} />}
          {activeTab === "snoozes" && <TeammateSnoozesTab />}
          {activeTab === "two-factor-auth" && <Teammate2FATab isEnabled={resources.twoFactorAuth?.enabled} />}
          
          {!["overview", "individual-inboxes", "channels", "teammate-groups", "shared-inboxes", "resource-permissions", "rules", "message-templates", "time-off", "shifts", "signatures", "notifications", "snoozes", "two-factor-auth"].includes(activeTab) && (
             <div className="rounded-3xl border border-border bg-background p-10 backdrop-blur-sm shadow-2xl">
                <div className="size-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-8">
                  {(() => {
                    const TabIcon = TABS.find(t => t.id === activeTab)?.icon || Settings;
                    return <TabIcon className="size-8 text-primary/70" />;
                  })()}
                </div>
                <h3 className="text-2xl font-bold text-foreground tracking-tight mb-4">
                  {TABS.find(t => t.id === activeTab)?.label} Management
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-2xl">
                  This section allows you to configure specific {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} settings for {user?.name}. 
                  The granular permissions and data scoping for this module are currently being synchronized.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="p-6 rounded-2xl border border-border bg-muted/30 hover:border-primary/20 transition-all group">
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                        <Zap className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h4 className="text-foreground font-bold mb-1">Parameter {i}</h4>
                      <p className="text-muted-foreground text-sm">Description of the parameter and its impact on teammate workflow.</p>
                    </div>
                  ))}
                </div>

                <div className="mt-12 pt-12 border-t border-border flex items-center gap-4 text-muted-foreground">
                  <Lock className="size-4" />
                  <span className="text-sm font-medium italic">Some settings are restricted to higher administrative levels.</span>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
