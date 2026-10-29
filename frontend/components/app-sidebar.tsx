"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Inbox,
  House,
  Settings2,
  Users,
  Key,
  Shield,
  Palette,
  Bell,
  Clock,
  History,
  Mail,
  RefreshCw,
  MessageSquare,
  PenTool,
  FileText,
  CircleUser,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  Trash2,
  CircleStop,
  FileEdit,
  UserCircle,
  ShieldCheck,
  Ticket,
  Tag,
  Database,
  Layout,
  Zap,
  CreditCard,
  ScrollText,
  ChevronRight,
  Eye,
  LayoutGrid,
  Calendar,
  CalendarDays,
  Layers3,
  Search,
  Lock,
  UserRoundPlus,
  List,
  BriefcaseBusiness,
  BarChart2, MoreVertical,
} from "lucide-react";


import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { usePreferences } from "@/context/preferences-context";
import { useWorkspaceStore } from "@/context/workspace-store";
import { WorkspaceViewSwitcher } from "@/components/workspace-view-switcher";
import { TagsSidebarSection } from "@/components/tags-sidebar-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// --- GLOBAL COMPANY SCOPE ITEMS ---
const globalTeamItems = [
  { title: "Teammates", href: "/settings/teammates", icon: Users },
  { title: "Teammate groups", href: "/settings/teammate-groups", icon: Users },
];
const globalResourceItems = [
  { title: "Inboxes", href: "/settings/inboxes", icon: Mail },
  { title: "Channels", href: "/settings/channels", icon: MessageSquare },
  { title: "Templates", href: "/settings/message-templates", icon: MessageSquare },
  { title: "Signatures", href: "/settings/signatures", icon: PenTool },
];
const globalGeneralItems = [
  { title: "Profile", href: "/settings/profile", icon: UserCircle },
  { title: "Security", href: "/settings/security", icon: ShieldCheck },
  { title: "Audit Log", href: "/settings/audit-log", icon: ScrollText },
  { title: "Preferences", href: "/settings/preferences", icon: Palette },
];

// --- ORGANIZATION (TEAM) SCOPE ITEMS ---
const orgTeamItems = [
  { title: "Teammates", href: "/settings/teammates", icon: Users },
  { title: "Users", href: "/settings/users", icon: Users },
  { title: "Roles & Permissions", href: "/settings/permissions", icon: Shield },
  { title: "Schedules", href: "/settings/schedule", icon: Clock },
];
const orgResourceItems = [
  { title: "Tags", href: "/settings/tags", icon: Tag },
];

const companyResourceItems = [
  { title: "Ticketing", href: "/settings/ticketing", icon: Ticket },
  { title: "Tags", href: "/settings/tags", icon: Tag },
  { title: "Custom Fields", href: "/settings/custom-fields", icon: Database },
  { title: "Workspaces", href: "/settings/workspaces", icon: Layout },
];

const orgViewItems = [
  { title: "Views", href: "/settings/views", icon: Eye },
  { title: "Custom Views", href: "/settings/custom-views", icon: LayoutGrid },
];
const orgAutomationItems = [
  { title: "Rules and Macros", href: "/settings/rules", icon: Zap },
];
const globalAutomationItems = [
  { title: "Rules", href: "/settings/rules", icon: Key },
];

// --- INDIVIDUAL SCOPE ITEMS ---
const individualGeneralItems = [
  { title: "Profile", href: "/settings/profile", icon: UserCircle },
  { title: "Schedule", href: "/settings/schedule", icon: Clock },
  { title: "Notifications", href: "/settings/notifications", icon: Bell },
  { title: "Snoozes", href: "/settings/snoozes", icon: Clock },
  { title: "Preferences", href: "/settings/preferences", icon: Palette },
];
const individualResourceItems = [
  { title: "Inboxes", href: "/settings/inboxes", icon: Mail },
  { title: "Channels", href: "/settings/channels", icon: MessageSquare },
  { title: "Tags", href: "/settings/tags", icon: Layers },
  { title: "Templates", href: "/settings/message-templates", icon: MessageSquare },
  { title: "Signatures", href: "/settings/signatures", icon: PenTool },
];

const individualAutomationItems = [
  { title: "Rules", href: "/settings/rules", icon: Key },
];

interface InboxListItem {
  id: string;
  name: string;
  address: string;
  scope_type?: string;
  scope_id?: string;
}

interface CalendarChannelItem {
  id: string;
  name: string;
  email_address: string;
  provider?: string;
}

interface SidebarViewItem {
  id: string;
  name: string;
  color?: string | null;
  emoji?: string | null;
}

const calendarSelectionStorageKey = "calendar-selected-channel-ids";

const contactNavItems = [
  { title: "Shared contacts", href: "/contacts?view=shared", view: "shared", icon: Users },
  { title: "Private contacts", href: "/contacts?view=private", view: "private", icon: Lock },
  { title: "Auto-created contacts", href: "/contacts?view=auto-created", view: "auto-created", icon: UserRoundPlus },
];

function SidebarCalendar({ anchorDate }: { anchorDate: Date }) {
  const [currentDate, setCurrentDate] = React.useState(anchorDate);
  const [selectedDate, setSelectedDate] = React.useState(anchorDate);

  React.useEffect(() => {
    setCurrentDate(anchorDate);
    setSelectedDate(anchorDate);
  }, [anchorDate]);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  
  const handlePrev = () => {
    const next = new Date(year, month - 1, 1);
    setCurrentDate(next);
    window.dispatchEvent(new CustomEvent("calendar-sidebar-month-change", { detail: { date: next.toISOString() } }));
  };
  
  const handleNext = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentDate(next);
    window.dispatchEvent(new CustomEvent("calendar-sidebar-month-change", { detail: { date: next.toISOString() } }));
  };
  
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  
  const daysInCurrentMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const today = new Date();
  
  const prevDays = Array.from({ length: firstDay }, (_, i) => prevMonthDays - firstDay + i + 1);
  const currentDays = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  
  // We show 6 rows of 7 days
  const remainingDays = 42 - (prevDays.length + currentDays.length);
  const nextDays = Array.from({ length: remainingDays }, (_, i) => i + 1);

  const emitDateChange = (next: Date) => {
    setCurrentDate(next);
    setSelectedDate(next);
    window.dispatchEvent(new CustomEvent("calendar-sidebar-month-change", { detail: { date: next.toISOString() } }));
  };
  
  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      <div className="flex items-center justify-between px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground hover:text-foreground"
          onClick={handlePrev}
          aria-label="Previous month"
        >
          <ChevronRight className="size-4 rotate-180" />
        </Button>
        <span className="truncate px-2 text-xs font-semibold text-foreground">
          {monthName} {year}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-md text-muted-foreground hover:text-foreground"
          onClick={handleNext}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {prevDays.map((day, i) => (
            <button
              key={`prev-${i}-${day}`}
              type="button"
              onClick={() => emitDateChange(new Date(year, month - 1, day))}
              className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Go to ${monthName} previous month day ${day}`}
            >
              {day}
            </button>
          ))}
          {currentDays.map(day => {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
            return (
              <button
                key={`current-${day}`} 
                type="button"
                onClick={() => emitDateChange(new Date(year, month, day))}
                className={`rounded-md p-1.5 transition-colors ${isSelected ? 'bg-[#5b5bfa] font-semibold text-white shadow-sm' : isToday ? 'text-foreground' : 'text-foreground hover:bg-muted'}`}
                aria-label={`Go to ${monthName} ${day}, ${year}`}
              >
                {day}
              </button>
            );
          })}
          {nextDays.map((day, i) => (
            <button
              key={`next-${i}-${day}`}
              type="button"
              onClick={() => emitDateChange(new Date(year, month + 1, day))}
              className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Go to next month day ${day}`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollapsedCalendarSummary({
  monthLabel,
  channelCount,
}: {
  monthLabel: string;
  channelCount: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-1 py-2">
      <div className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/60 text-sidebar-foreground">
        <CalendarDays className="size-4" />
      </div>
      <div className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/20 text-sidebar-foreground">
        <Layers3 className="size-4" />
      </div>
      <div className="mt-1 rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold text-sidebar-accent-foreground">
        {channelCount}
      </div>
      <div className="max-w-full truncate px-1 text-center text-[10px] font-medium text-sidebar-foreground/70">
        {monthLabel}
      </div>
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "assigned";
  const contactsView = searchParams.get("view") || "shared";
  
  const { prefs, updatePref } = usePreferences();
  const { scopeType, scopeId, activeView, setActiveView } = useWorkspaceStore();
  const { state } = useSidebar();
  const { data: session } = authClient.useSession();
  
  const [isOpenSectionExpanded, setIsOpenSectionExpanded] = React.useState(false);
  const [isMoreSectionExpanded, setIsMoreSectionExpanded] = React.useState(false);
  const [isContactsExpanded, setIsContactsExpanded] = React.useState(false);
  const [isAccountsExpanded, setIsAccountsExpanded] = React.useState(false);
  const [expandedOrgs, setExpandedOrgs] = React.useState<Record<string, boolean>>({});
  
  const toggleOrgExpansion = (orgId: string) => {
    setExpandedOrgs(prev => ({ ...prev, [orgId]: !prev[orgId] }));
  };
  
  const { data: orgData } = authClient.useActiveOrganization();

  // Reset all sidebar dropdowns/groups to collapsed when switching organization, view, or scope
  React.useEffect(() => {
    setIsOpenSectionExpanded(false);
    setIsMoreSectionExpanded(false);
    setExpandedOrgs({});
    setIsContactsExpanded(false);
    setIsAccountsExpanded(false);
  }, [orgData?.id, activeView, scopeId]);
  const { data: allOrgs } = authClient.useListOrganizations();
  const orgName = orgData?.name || "Patterns Group";
  const monthLabel = React.useMemo(() => {
    return new Date().toLocaleString("default", { month: "short", year: "numeric" });
  }, []);
  
  const [inboxList, setInboxList] = React.useState<InboxListItem[]>([]);
  const [isLoadingInboxes, setIsLoadingInboxes] = React.useState(false);
  const [sidebarViews, setSidebarViews] = React.useState<SidebarViewItem[]>([]);
  const [calendarChannels, setCalendarChannels] = React.useState<CalendarChannelItem[]>([]);
  const [checkedCalendarIds, setCheckedCalendarIds] = React.useState<string[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = React.useState(false);
  const [calendarAnchorDate, setCalendarAnchorDate] = React.useState(new Date());
  const [sidebarLists, setSidebarLists] = React.useState<any[]>([]);
  const [sidebarAccounts, setSidebarAccounts] = React.useState<any[]>([]);
  const [sidebarChannels, setSidebarChannels] = React.useState<CalendarChannelItem[]>([]);

  const loadInboxList = React.useCallback(async () => {
    setIsLoadingInboxes(true);
    try {
      const response = await fetch("/api/settings/inboxes", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setInboxList(data.inboxes || []);
      }
    } catch (error) {
      console.error("Failed to load inboxes:", error);
    } finally {
      setIsLoadingInboxes(false);
    }
  }, []);

  const loadSidebarChannels = React.useCallback(async () => {
    try {
      const response = await fetch("/api/settings/channels", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setSidebarChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to load sidebar channels:", error);
    }
  }, []);

  const loadCalendarChannels = React.useCallback(async () => {
    setIsLoadingCalendars(true);
    try {
      const response = await fetch("/api/settings/channels", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const channels = data.channels || [];
        setCalendarChannels(channels);
        setCheckedCalendarIds((current) => {
          const stored = typeof window !== "undefined"
            ? window.localStorage.getItem(calendarSelectionStorageKey)
            : null;
          let storedIds: string[] = [];
          try {
            const parsed = stored ? JSON.parse(stored) : [];
            storedIds = Array.isArray(parsed) ? parsed : [];
          } catch {
            storedIds = [];
          }
          const validIds = new Set(channels.map((channel: CalendarChannelItem) => channel.id));
          const stillChecked = (Array.isArray(storedIds) && storedIds.length > 0 ? storedIds : current).filter((id) => validIds.has(id));
          return stillChecked.length > 0 ? stillChecked : channels.map((channel: CalendarChannelItem) => channel.id);
        });
      }
    } catch (error) {
      console.error("Failed to load calendar channels:", error);
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  const loadSidebarLists = React.useCallback(async () => {
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
      const res = await fetch("/api/contacts/lists", { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSidebarLists(data.lists || []);
      }
    } catch (error) {
      console.error("Failed to load sidebar lists:", error);
    }
  }, [orgData?.id]);

  const loadSidebarAccounts = React.useCallback(async () => {
    try {
      const headers = orgData?.id ? { "x-org-id": orgData.id } : undefined;
      const res = await fetch("/api/contacts/accounts", { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSidebarAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to load sidebar accounts:", error);
    }
  }, [orgData?.id]);

  React.useEffect(() => {
    if (!pathname.startsWith("/calendar")) return;

    const handleAnchorChange = (event: Event) => {
      const detail = (event as CustomEvent<{ date?: string }>).detail;
      if (detail?.date) {
        setCalendarAnchorDate(new Date(detail.date));
      }
    };

    window.addEventListener("calendar-anchor-change", handleAnchorChange);
    return () => window.removeEventListener("calendar-anchor-change", handleAnchorChange);
  }, [pathname]);

  React.useEffect(() => {
    if (!pathname.startsWith("/calendar")) return;

    window.localStorage.setItem(calendarSelectionStorageKey, JSON.stringify(checkedCalendarIds));
    window.dispatchEvent(new CustomEvent("calendar-channel-selection-change", {
      detail: { selectedChannelIds: checkedCalendarIds },
    }));
  }, [checkedCalendarIds, pathname]);

  React.useEffect(() => {
    if (pathname.startsWith("/inbox")) {
      setActiveView("inbox");
      void loadInboxList();
      void loadSidebarChannels();
      if (orgData?.id) {
        fetch("/api/settings/views", { headers: { "x-org-id": orgData.id }, cache: "no-store" })
          .then((r) => r.ok ? r.json() : [])
          .then((data) => setSidebarViews(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    } else if (pathname.startsWith("/settings")) {
      setActiveView("settings");
    } else if (pathname.startsWith("/calendar")) {
      setActiveView("calendar");
      void loadCalendarChannels();
    } else if (pathname.startsWith("/contacts")) {
      setActiveView("contacts");
      void loadSidebarLists();
      void loadSidebarAccounts();
    }
  }, [pathname, setActiveView, loadInboxList, loadSidebarChannels, loadCalendarChannels, loadSidebarLists, loadSidebarAccounts, orgData?.id]);

  React.useEffect(() => {
    const handleRefresh = () => {
      if (activeView === "contacts") {
        void loadSidebarLists();
        void loadSidebarAccounts();
      }
    };
    window.addEventListener("contacts-data-changed", handleRefresh);
    return () => window.removeEventListener("contacts-data-changed", handleRefresh);
  }, [activeView, loadSidebarLists, loadSidebarAccounts]);

  const toggleCalendarChannel = (channelId: string) => {
    setCheckedCalendarIds((current) => {
      if (current.includes(channelId)) {
        return current.filter((id) => id !== channelId);
      }
      return [...current, channelId];
    });
  };

  // Convert settings arrays to NavMain items based on scopeType
  const getNavMainItems = () => {
    const mapItems = (arr: any[]) => arr.map(i => ({
      title: i.title,
      url: i.href,
      isActive: pathname.startsWith(i.href),
    }));

    const buildGroup = (title: string, icon: JSX.Element, arr: any[]) => {
      const items = mapItems(arr);
      const isActive = items.some(i => i.isActive);
      return { title, url: "#", icon, items, isActive };
    };

    if (scopeType === "company") {
      return [
        buildGroup("Team Management", <Users />, globalTeamItems),
        buildGroup("Resources", <Layers />, [...companyResourceItems, ...globalResourceItems]),
        buildGroup("Automation", <Zap />, globalAutomationItems),
        buildGroup("General", <Settings2 />, globalGeneralItems),
      ];
    } else if (scopeType === "organization") {
      return [
        buildGroup("Team Management", <Users />, orgTeamItems),
        buildGroup("Resources", <Layers />, [...globalResourceItems, ...orgResourceItems, ...orgViewItems]),
        buildGroup("Automation", <Zap />, orgAutomationItems),
      ];
    } else {
      return [
        buildGroup("General", <Settings2 />, individualGeneralItems),
        buildGroup("Resources", <Layers />, individualResourceItems),
        buildGroup("Automation", <Zap />, individualAutomationItems),
      ];
    }
  };

  const navUserProps = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-border" {...props}>
      <SidebarHeader className={cn("border-b border-border pb-4 pt-4 bg-card/10", state === "collapsed" ? "px-1.5" : "px-4")}>
        <div className="flex flex-col gap-4">
          <WorkspaceViewSwitcher />
          
          {activeView === "settings" && state === "expanded" && (
            <div className="animate-in fade-in duration-200">
              <div className="flex min-w-0 items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] truncate">{orgName}</p>
              </div>
              <ScopeSwitcher />
            </div>
          )}

          {activeView === "inbox" && state === "expanded" && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex min-w-0 items-center justify-between">
                <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] truncate flex items-center gap-2">
                  <Inbox className="size-3.5" />
                  Inbox
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Conversations & messages</p>
            </div>
          )}

          {activeView === "calendar" && state === "expanded" && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="mt-1 flex min-w-0 items-center justify-between">
                <p className="truncate text-sm font-semibold text-foreground">
                  Calendar
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("calendar-open-new-event"));
                  }}
                  aria-label="Create event"
                >
                  <span className="text-lg leading-none">+</span>
                </Button>
              </div>
            </div>
          )}

          {activeView === "calendar" && state === "collapsed" && (
            <div className="animate-in fade-in duration-200">
              <CollapsedCalendarSummary
                monthLabel={monthLabel}
                channelCount={checkedCalendarIds.length}
              />
            </div>
          )}

          {activeView === "contacts" && state === "expanded" && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="mt-1 flex min-w-0 items-center justify-between">
                <p className="truncate text-sm font-semibold text-foreground">
                  Contacts
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Search contacts"
                >
                  <Search className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {activeView === "analytics" && state === "expanded" && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="mt-1 flex min-w-0 items-center justify-between">
                <p className="truncate text-sm font-semibold text-foreground">
                  Analytics
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Event-driven metrics &amp; insights</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {activeView === "settings" && (
          <NavMain items={getNavMainItems()} />
        )}

        {activeView === "calendar" && state === "expanded" && (
          <SidebarCalendar anchorDate={calendarAnchorDate} />
        )}

        {activeView === "calendar" && state === "expanded" && (
          <div className="flex flex-col gap-4 px-2 py-2">
            <div className="mt-2">
              <Input
                placeholder="Find people"
                className="h-9 border-border/70 bg-background text-xs placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="mt-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Calendars
            </div>
            <div className="flex flex-col gap-2">
              {isLoadingCalendars && calendarChannels.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">Loading calendars...</p>
              )}
              {!isLoadingCalendars && calendarChannels.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">Connect a channel to add a calendar.</p>
              )}
              {calendarChannels.map((channel, index) => (
                <label
                  key={channel.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checkedCalendarIds.includes(channel.id)}
                    onCheckedChange={() => toggleCalendarChannel(channel.id)}
                  />
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ["#58bfca", "#6c63ff", "#2fbf71", "#f59f45"][index % 4] }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {channel.email_address || channel.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {activeView === "calendar" && state === "collapsed" && (
          <div className="flex flex-col items-center gap-2 px-1 py-2">
            {calendarChannels.slice(0, 3).map((channel, index) => (
              <div
                key={channel.id}
                className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/30 text-[10px] font-semibold text-sidebar-foreground"
                style={{
                  borderColor: ["#58bfca55", "#6c63ff55", "#2fbf7155"][index % 3],
                }}
                title={channel.email_address || channel.name}
              >
                {(channel.email_address || channel.name).charAt(0).toUpperCase()}
              </div>
            ))}
            {calendarChannels.length > 3 && (
              <div className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold text-sidebar-accent-foreground">
                +{calendarChannels.length - 3}
              </div>
            )}
          </div>
        )}

        {activeView === "contacts" && (
          <div className="space-y-4 px-2 py-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {state === "collapsed" ? (
                    <>
                      {/* Contacts Section Collapsed */}
                      <SidebarMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                              tooltip="Contacts"
                              className="h-10 rounded-md hover:bg-muted/50 data-[active=true]:bg-muted"
                              isActive={contactsView !== "accounts" && !searchParams.get("accountId")}
                            >
                              <Users className="size-4 text-muted-foreground" />
                              <span>Contacts</span>
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-56">
                            <DropdownMenuItem asChild>
                              <Link href="/contacts?view=shared" className="font-medium">Shared contacts</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/contacts?view=private" className="font-medium">Private contacts</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/contacts?view=auto-created" className="font-medium">Auto-created contacts</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/contacts?view=lists" className="font-medium">Lists</Link>
                            </DropdownMenuItem>
                            {sidebarLists.length > 0 && (
                              <>
                                <div className="h-px my-1 bg-muted" />
                                {sidebarLists.map((list) => (
                                  <DropdownMenuItem key={list.id} asChild>
                                    <Link href={`/contacts?view=shared&listId=${list.id}`} className="pl-6 text-xs text-muted-foreground">
                                      # {list.name}
                                    </Link>
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>

                      {/* Accounts Section Collapsed */}
                      <SidebarMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                              tooltip="Accounts"
                              className="h-10 rounded-md hover:bg-muted/50 data-[active=true]:bg-muted"
                              isActive={contactsView === "accounts" || !!searchParams.get("accountId")}
                            >
                              <BriefcaseBusiness className="size-4 text-muted-foreground" />
                              <span>Accounts</span>
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-56">
                            <DropdownMenuItem asChild>
                              <Link href="/contacts?view=accounts" className="font-medium">Accounts</Link>
                            </DropdownMenuItem>
                            {sidebarAccounts.length > 0 && (
                              <>
                                <div className="h-px my-1 bg-muted" />
                                {sidebarAccounts.map((account) => (
                                  <DropdownMenuItem key={account.id} asChild>
                                    <Link href={`/contacts?view=shared&accountId=${account.id}`} className="pl-6 text-xs text-muted-foreground">
                                      {account.name}
                                    </Link>
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    </>
                  ) : (
                    <>
                      {/* Contacts Section Expanded */}
                      <Collapsible
                        asChild
                        open={isContactsExpanded}
                        onOpenChange={setIsContactsExpanded}
                        className="group/collapsible mb-2"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip="Contacts" className="h-10 rounded-md hover:bg-muted/50 data-[active=true]:bg-muted">
                              <Users className="size-4 text-muted-foreground" />
                              <span>Contacts</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={contactsView === "shared" && !searchParams.get("listId") && !searchParams.get("accountId")}>
                                  <Link href="/contacts?view=shared"><span>Shared contacts</span></Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={contactsView === "private" && !searchParams.get("listId") && !searchParams.get("accountId")}>
                                  <Link href="/contacts?view=private"><span>Private contacts</span></Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={contactsView === "auto-created" && !searchParams.get("listId") && !searchParams.get("accountId")}>
                                  <Link href="/contacts?view=auto-created"><span>Auto-created contacts</span></Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={contactsView === "lists" && !searchParams.get("listId") && !searchParams.get("accountId")}>
                                  <Link href="/contacts?view=lists"><span>Lists</span></Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* Render individual lists underneath if they exist */}
                              {sidebarLists.map((list) => (
                                <SidebarMenuSubItem key={list.id} className="pl-4">
                                  <SidebarMenuSubButton asChild isActive={searchParams.get("listId") === list.id}>
                                    <Link href={`/contacts?view=shared&listId=${list.id}`}>
                                      <span className="truncate"># {list.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>

                      {/* Accounts Section Expanded */}
                      <Collapsible
                        asChild
                        open={isAccountsExpanded}
                        onOpenChange={setIsAccountsExpanded}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip="Accounts" className="h-10 rounded-md hover:bg-muted/50 data-[active=true]:bg-muted">
                              <BriefcaseBusiness className="size-4 text-muted-foreground" />
                              <span>Accounts</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={contactsView === "accounts" && !searchParams.get("listId") && !searchParams.get("accountId")}>
                                  <Link href="/contacts?view=accounts"><span>Accounts</span></Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {/* Render individual accounts underneath if they exist */}
                              {sidebarAccounts.map((account) => (
                                <SidebarMenuSubItem key={account.id} className="pl-4">
                                  <SidebarMenuSubButton asChild isActive={searchParams.get("accountId") === account.id}>
                                    <Link href={`/contacts?view=shared&accountId=${account.id}`}>
                                      <span className="truncate">{account.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        )}

        {activeView === "analytics" && (
          <div className="space-y-2 px-1">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2 flex items-center gap-2">
                <BarChart2 className="size-3" />
                Overview
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/analytics"} className="hover:bg-muted/50 data-[active=true]:bg-violet-500/10 data-[active=true]:text-violet-400 rounded-lg transition-colors">
                      <Link href="/analytics" className="flex items-center gap-2.5">
                        <BarChart2 className="size-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        )}

        {activeView === "inbox" && (
          <div className="space-y-4">
            <TagsSidebarSection />

            {/* Views section */}
            {sidebarViews.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2 flex items-center gap-2">
                  <Eye className="size-3" />
                  Views
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sidebarViews.map((view) => {
                      const viewHref = `/inbox?viewId=${view.id}`;
                      const isActive = typeof window !== "undefined" && window.location.search.includes(`viewId=${view.id}`);
                      return (
                        <SidebarMenuItem key={view.id}>
                          <SidebarMenuButton asChild isActive={isActive} className="hover:bg-muted/50 data-[active=true]:bg-indigo-500/10 data-[active=true]:text-indigo-400 rounded-lg transition-colors">
                            <Link href={viewHref} className="flex items-center gap-2.5">
                              <div
                                className="size-5 rounded-md flex items-center justify-center text-xs shrink-0"
                                style={{
                                  backgroundColor: view.color && view.color !== "transparent" ? `${view.color}22` : "rgba(99,102,241,0.12)",
                                  border: `1px solid ${view.color && view.color !== "transparent" ? `${view.color}44` : "rgba(99,102,241,0.25)"}`,
                                }}
                              >
                                {view.emoji ? (
                                  <span className="text-[10px]">{view.emoji}</span>
                                ) : (
                                  <Eye className="size-3" style={{ color: view.color && view.color !== "transparent" ? view.color : "#818cf8" }} />
                                )}
                              </div>
                              <span className="truncate text-[13px]">{view.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupLabel 
                className="flex items-center justify-between cursor-pointer hover:text-muted-foreground transition-colors group/label"
                onClick={() => setIsOpenSectionExpanded(!isOpenSectionExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Inbox className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Open</span>
                </div>
                {isOpenSectionExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </SidebarGroupLabel>
              {isOpenSectionExpanded && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "assigned"}>
                        <Link href="/inbox?filter=assigned">
                          <CircleUser className="size-4" />
                          <span>Assigned to me</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "subscribed"}>
                        <Link href="/inbox?filter=subscribed">
                          <Bell className="size-4" />
                          <span>Subscribed</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "snoozed"}>
                      <Link href="/inbox?filter=snoozed">
                        <Clock className="size-4" />
                        <span>Later</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "closed"}>
                      <Link href="/inbox?filter=closed">
                        <CheckCircle2 className="size-4" />
                        <span>Done</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "drafts"}>
                      <Link href="/inbox?filter=drafts">
                        <FileEdit className="size-4" />
                        <span>Drafts</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel 
                className="flex items-center justify-between cursor-pointer hover:text-muted-foreground transition-colors"
                onClick={() => setIsMoreSectionExpanded(!isMoreSectionExpanded)}
              >
                <div className="flex items-center gap-2">
                  {isMoreSectionExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{isMoreSectionExpanded ? 'Less' : 'More'}</span>
                </div>
              </SidebarGroupLabel>
              {isMoreSectionExpanded && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "sent"}>
                        <Link href="/inbox?filter=sent">
                          <Send className="size-4" />
                          <span>Sent</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "trash"}>
                        <Link href="/inbox?filter=trash">
                          <Trash2 className="size-4" />
                          <span>Trash</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/inbox" && filter === "spam"}>
                        <Link href="/inbox?filter=spam">
                          <CircleStop className="size-4" />
                          <span>Spam</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>

            {/* My Channels (personal Gmail inboxes) */}
            {(() => {
              const userEmail = session?.user?.email?.toLowerCase();
              const myChannels = sidebarChannels.filter(
                (ch) => userEmail && ch.email_address?.toLowerCase() === userEmail
              );
              if (myChannels.length === 0) return null;
              return (
                <SidebarGroup className="mt-2">
                  <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2 flex items-center gap-2">
                    <CircleUser className="size-3" />
                    <span>My Channels</span>
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {myChannels.map((channel) => {
                        const channelHref = `/inbox?channelId=${channel.id}`;
                        const isActive = pathname === "/inbox" && typeof window !== "undefined" && window.location.search.includes(`channelId=${channel.id}`);
                        return (
                          <SidebarMenuItem key={channel.id}>
                            <SidebarMenuButton asChild isActive={isActive} title={channel.name} className="h-9 py-0 hover:bg-muted/50 data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-400 transition-all rounded-md">
                              <Link href={channelHref} className="flex items-center gap-2.5 w-full">
                                <div className={cn(
                                  "flex size-4 items-center justify-center rounded text-[10px] font-bold transition-all",
                                  isActive ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-muted text-muted-foreground"
                                )}>
                                  {channel.name.charAt(0).toUpperCase()}
                                </div>
                                <span className={cn("truncate text-[13px]", isActive ? "font-semibold" : "text-muted-foreground")}>{channel.name}</span>
                                <Lock className="ml-auto size-2.5 text-muted-foreground/40 shrink-0" />
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })()}

            <SidebarGroup className="mt-2">
              <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2 flex items-center justify-between">
                <span>Shared</span>
                <button type="button" onClick={() => void loadInboxList()} className="text-muted-foreground hover:text-primary transition-colors" title="Refresh inboxes">
                  <RefreshCw className={cn("size-3", isLoadingInboxes && "animate-spin")} />
                </button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoadingInboxes && inboxList.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Loading...</p>
                  )}
                  {/* Group inboxes by Organization */}
                  {(() => {
                    const orgs: Array<{id: string, name: string}> = [];
                    if (allOrgs && allOrgs.length > 0) {
                      allOrgs.forEach(o => orgs.push(o));
                    }
                    if (orgData && !orgs.find(o => o.id === orgData.id)) {
                      orgs.push(orgData);
                    }

                    if (orgs.length === 0 && inboxList.length > 0) {
                      orgs.push({ id: "org-patterns-global", name: "Patterns Group" });
                    }

                    return orgs.map((org) => {
                      const otherOrgIds = orgs.filter(o => o.id !== org.id).map(o => o.id);
                      const orgInboxes = inboxList.filter(i => {
                        if (prefs?.hiddenInboxes?.includes(i.id)) return false;
                        if (i.scope_id === org.id) return true;
                        if (org.id === "org-patterns-global") {
                          return !otherOrgIds.includes(i.scope_id || "");
                        }
                        if (orgs.length === 1) return true;
                        return false;
                      });
                      
                      if (orgInboxes.length === 0) return null;

                      const displayInboxes = prefs?.alphabeticalSort !== false
                        ? [...orgInboxes].sort((a, b) => a.name.localeCompare(b.name))
                        : orgInboxes;
                      const isExpanded = expandedOrgs[org.id] === true;

                      return (
                        <SidebarMenuItem key={org.id} className="mb-2">
                          <SidebarMenuButton 
                            onClick={() => toggleOrgExpansion(org.id)}
                            className="w-full justify-start hover:bg-muted/50 px-2 py-1.5 h-auto transition-colors"
                          >
                            <div className="flex items-center gap-2.5 w-full">
                              {isExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                              <div className="size-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shadow-sm">
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-foreground tracking-tight">{org.name}</span>
                              {prefs?.badgeCounter !== "none" && (
                                <SidebarMenuBadge className="ml-auto bg-muted text-muted-foreground text-[10px]">{orgInboxes.length}</SidebarMenuBadge>
                              )}
                            </div>
                          </SidebarMenuButton>
                          
                          {isExpanded && (
                            <SidebarMenuSub>
                              {displayInboxes.map((inbox) => {
                                const inboxHref = `/inbox?inboxId=${inbox.id}`;
                                const isActive = pathname === "/inbox" && typeof window !== "undefined" && window.location.search.includes(inbox.id);
                                return (
                                  <SidebarMenuSubItem key={inbox.id} className="group/subitem relative">
                                    <SidebarMenuSubButton asChild isActive={isActive} title={inbox.name} className="h-9 py-0 hover:bg-muted/50 data-[active=true]:bg-indigo-500/10 data-[active=true]:text-indigo-400 transition-all rounded-md pr-8">
                                      <Link href={inboxHref} className="flex items-center gap-2.5 w-full">
                                        <div className={cn(
                                          "flex size-4 items-center justify-center rounded text-[10px] font-bold transition-all",
                                          isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-muted text-muted-foreground"
                                        )}>
                                          {inbox.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={cn("truncate text-[13px]", isActive ? "font-semibold" : "text-muted-foreground")}>{inbox.name}</span>
                                      </Link>
                                    </SidebarMenuSubButton>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="absolute right-1 top-1.5 opacity-0 group-hover/subitem:opacity-100 data-[state=open]:opacity-100 flex items-center justify-center p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                          <MoreVertical className="size-3.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-48">
                                        <DropdownMenuItem asChild>
                                          <Link href={`/settings/inboxes?id=${inbox.id}`}>Edit inbox</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          updatePref("hiddenInboxes", [...(prefs?.hiddenInboxes || []), inbox.id]);
                                        }}>
                                          Hide in sidebar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                          <Link href="/settings/preferences">Edit sidebar</Link>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      );
                    });
                  })()}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={navUserProps} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
