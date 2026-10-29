"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  Mail,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  Video,
  X,
} 
from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/context/workspace-store";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type CalendarView = "month" | "week";

type Channel = {
  id: string;
  name: string;
  email_address: string;
  provider: "gmail" | "outlook" | string;
  oauth_status?: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  provider?: string;
  meetingLink?: string | null;
  attendees?: Array<{ id: string; email: string; status: string }>;
};

type DraftEvent = {
  id?: string;
  date: Date;
  title: string;
  startTime: string;
  endTime: string;
  channelId: string;
  guests: string;
  location: string;
  description: string;
  generateMeetLink: boolean;
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarSelectionStorageKey = "calendar-selected-channel-ids";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const next = startOfDay(date);
  next.setDate(next.getDate() - day);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function buildDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0);
}

function timeFromHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function defaultEndTime(hour: number) {
  return timeFromHour(Math.min(hour + 1, 23));
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function parseGuestEmails(value: string) {
  return value
    .split(/,|\n/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatTimeRange(event: CalendarEvent) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function normalizeProvider(value?: string | null) {
  if (!value) return "";
  const normalized = value.toLowerCase();
  return normalized === "google" ? "gmail" : normalized;
}

function getMonthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getWeekCells(anchor: Date) {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export default function CalendarPage() {
  const router = useRouter();
  const { setActiveView, setScope } = useWorkspaceStore();
  const { data: orgData } = authClient.useActiveOrganization();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    setActiveView("calendar");
  }, [setActiveView]);

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsResponse, channelsResponse] = await Promise.all([
        fetch("/api/calendar/events", {
          headers: orgData?.id ? { "x-org-id": orgData.id } : undefined,
          cache: "no-store",
        }),
        fetch("/api/settings/channels", { cache: "no-store" }),
      ]);

      if (eventsResponse.ok) {
        const data = await eventsResponse.json();
        setEvents(data.events || []);
      }
      if (channelsResponse.ok) {
        const data = await channelsResponse.json();
        const nextChannels = data.channels || [];
        setChannels(nextChannels);
        setSelectedChannelIds((current) => {
          let storedIds: string[] = [];
          try {
            const parsed = window.localStorage.getItem(calendarSelectionStorageKey);
            storedIds = parsed ? JSON.parse(parsed) : [];
          } catch {
            storedIds = [];
          }
          const validIds = new Set(nextChannels.map((channel: Channel) => channel.id));
          const nextSelection = (storedIds.length > 0 ? storedIds : current).filter((id) => validIds.has(id));
          return nextSelection.length > 0 ? nextSelection : nextChannels.map((channel: Channel) => channel.id);
        });
      }
    } catch (error) {
      console.error("Failed to load calendar", error);
    } finally {
      setIsLoading(false);
    }
  }, [orgData?.id]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("calendar-anchor-change", { detail: { date: anchorDate.toISOString() } }));
  }, [anchorDate]);

  const visibleEvents = useMemo(() => {
    if (selectedChannelIds.length === 0) return [];
    const selectedChannels = channels.filter((channel) => selectedChannelIds.includes(channel.id));
    const selectedProviderNames = new Set(selectedChannels.map((channel) => normalizeProvider(channel.provider)));

    return events.filter((event) => {
      if (!event.provider) return true;
      if (selectedChannelIds.includes(event.provider)) return true;
      return selectedProviderNames.has(normalizeProvider(event.provider));
    });
  }, [channels, events, selectedChannelIds]);
  const monthCells = useMemo(() => getMonthCells(anchorDate), [anchorDate]);
  const weekCells = useMemo(() => getWeekCells(anchorDate), [anchorDate]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const activeChannels = channels;
  const defaultChannelId = selectedChannelIds[0] || channels[0]?.id || "";
  const hasCalendars = channels.length > 0;

  const openConnectFlow = (provider: "google" | "office365") => {
    setScope("individual", "global");
    router.push(`/settings/connect-channel?from=calendar&provider=${provider}`);
  };

  const openDraft = useCallback((date: Date, hour = 9) => {
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setAnchorDate(selectedDate);
    setDraft({
      date: selectedDate,
      title: "",
      startTime: timeFromHour(hour),
      endTime: defaultEndTime(hour),
      channelId: defaultChannelId,
      guests: "",
      location: "",
      description: "",
      generateMeetLink: false,
    });
  }, [defaultChannelId]);

  useEffect(() => {
    const handleSelectionChange = (event: Event) => {
      const detail = (event as CustomEvent<{ selectedChannelIds?: string[] }>).detail;
      if (Array.isArray(detail?.selectedChannelIds)) {
        setSelectedChannelIds(detail.selectedChannelIds);
      }
    };

    const handleSidebarMonthChange = (event: Event) => {
      const detail = (event as CustomEvent<{ date?: string }>).detail;
      if (detail?.date) {
        setAnchorDate(new Date(detail.date));
      }
    };

    const handleOpenNewEvent = () => {
      openDraft(anchorDate, 9);
    };

    window.addEventListener("calendar-channel-selection-change", handleSelectionChange);
    window.addEventListener("calendar-sidebar-month-change", handleSidebarMonthChange);
    window.addEventListener("calendar-open-new-event", handleOpenNewEvent);
    return () => {
      window.removeEventListener("calendar-channel-selection-change", handleSelectionChange);
      window.removeEventListener("calendar-sidebar-month-change", handleSidebarMonthChange);
      window.removeEventListener("calendar-open-new-event", handleOpenNewEvent);
    };
  }, [anchorDate, openDraft]);

  const openEditDraft = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    setAnchorDate(start);
    setPreviewEvent(null);
    setDraft({
      id: event.id,
      date: start,
      title: event.title,
      startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      channelId: event.provider || defaultChannelId,
      guests: event.attendees?.map((attendee) => attendee.email).join(", ") || "",
      location: "",
      description: event.description || "",
      generateMeetLink: Boolean(event.meetingLink),
    });
  };

  const saveDraft = async () => {
    if (!draft?.title.trim()) return;
    setIsSaving(true);
    try {
      const start = buildDateTime(draft.date, draft.startTime);
      const end = buildDateTime(draft.date, draft.endTime);
      const descriptionParts = [draft.description.trim(), draft.location ? `Location: ${draft.location}` : ""].filter(Boolean);
      const response = await fetch(draft.id ? `/api/calendar/events/${draft.id}` : "/api/calendar/events", {
        method: draft.id ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json",
          ...(orgData?.id ? { "x-org-id": orgData.id } : {}),
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: descriptionParts.join("\n\n"),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          channelId: draft.channelId || defaultChannelId,
          attendees: parseGuestEmails(draft.guests),
          generateMeetLink: draft.generateMeetLink,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const savedEvent = {
          ...data.event,
          provider: data.event.provider || draft.channelId || defaultChannelId,
        };
        setEvents((current) => {
          const withoutCurrent = current.filter((event) => event.id !== savedEvent.id);
          return [...withoutCurrent, savedEvent].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        });
        setDraft(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const moveBackward = () => {
    setAnchorDate((current) => view === "month" ? addMonths(current, -1) : addDays(current, -7));
  };

  const moveForward = () => {
    setAnchorDate((current) => view === "month" ? addMonths(current, 1) : addDays(current, 7));
  };

  const deleteEvent = async (event: CalendarEvent) => {
    const response = await fetch(`/api/calendar/events/${event.id}`, {
      method: "DELETE",
      headers: orgData?.id ? { "x-org-id": orgData.id } : undefined,
    });
    if (response.ok) {
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setPreviewEvent(null);
    }
  };

  const mailEvent = (event: CalendarEvent) => {
    const subject = encodeURIComponent(`Calendar event: ${event.title}`);
    const body = encodeURIComponent([
      event.title,
      formatDateLabel(new Date(event.startTime)),
      formatTimeRange(event),
      event.description || "",
      event.meetingLink ? `Meeting link: ${event.meetingLink}` : "",
    ].filter(Boolean).join("\n"));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyEventId = async (event: CalendarEvent) => {
    await navigator.clipboard?.writeText(event.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading calendar...
      </div>
    );
  }

  if (!hasCalendars) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-background p-8">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted/40">
            <CalendarIcon className="size-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">No calendars</h1>
            <p className="text-sm text-muted-foreground">
              Connect your work email account to make it available as a calendar.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Button className="gap-2" onClick={() => openConnectFlow("google")}>
              <Mail className="size-4" />
              Connect Gmail
            </Button>
            <Button className="gap-2" variant="outline" onClick={() => openConnectFlow("office365")}>
              <Mail className="size-4" />
              Microsoft 365
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={moveBackward} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={moveForward} aria-label="Next">
              <ChevronRight className="size-4" />
            </Button>
            <h1 className="text-2xl font-semibold">{formatMonthTitle(anchorDate)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button className="gap-2" onClick={() => openDraft(startOfDay(new Date()), 9)}>
              <Plus className="size-4" />
              New event
            </Button>
            <Select value={view} onValueChange={(value) => setView(value as CalendarView)}>
              <SelectTrigger className="h-10 min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <main className="h-full min-w-0 overflow-auto">
            {view === "month" ? (
              <MonthGrid
                anchorDate={anchorDate}
                cells={monthCells}
                events={visibleEvents}
                onCellClick={(date) => openDraft(date, 9)}
                onEventClick={setPreviewEvent}
              />
            ) : (
              <WeekGrid
                days={weekCells}
                hours={hours}
                events={visibleEvents}
                onCellClick={openDraft}
                onEventClick={setPreviewEvent}
              />
            )}
          </main>
        </div>
      </div>

      {draft && (
        <EventDrawer
          draft={draft}
          isSaving={isSaving}
          activeChannels={activeChannels}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
      {previewEvent && !draft && (
        <EventPreview
          event={previewEvent}
          channel={channels.find((channel) => channel.id === previewEvent.provider)}
          onClose={() => setPreviewEvent(null)}
          onEdit={() => openEditDraft(previewEvent)}
          onDelete={() => void deleteEvent(previewEvent)}
          onMail={() => mailEvent(previewEvent)}
          onCopy={() => void copyEventId(previewEvent)}
        />
      )}
    </div>
  );
}

function MonthGrid({
  anchorDate,
  cells,
  events,
  onCellClick,
  onEventClick,
}: {
  anchorDate: Date;
  cells: Date[];
  events: CalendarEvent[];
  onCellClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="min-w-[900px]">
      <div className="grid h-11 grid-cols-7 border-b-2 border-black dark:border-white bg-background text-sm font-medium text-foreground">
        {dayLabels.map((day) => (
          <div key={day} className="flex items-center px-3">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[2px] bg-black dark:bg-white border-2 border-black dark:border-white">
        {cells.map((date) => {
          const dayEvents = events.filter((event) => sameDay(new Date(event.startTime), date));
          const isCurrentMonth = date.getMonth() === anchorDate.getMonth();
          return (
            <div
              key={date.toISOString()}
              onClick={() => onCellClick(date)}
              role="button"
              tabIndex={0}
              className={cn(
                "flex h-40 cursor-pointer flex-col bg-background p-3 text-left transition-colors hover:bg-muted/40",
                !isCurrentMonth && "text-muted-foreground/60"
              )}
            >
              <span className="mb-2 text-xl font-semibold">{date.getDate()}</span>
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onEventClick(event);
                    }}
                    className="flex w-full items-center gap-2 truncate rounded-md bg-muted px-2 py-1 text-left text-xs font-semibold text-foreground hover:bg-muted/80"
                  >
                    <span className="size-2 shrink-0 rounded-full bg-[#1fa7b5]" />
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  hours,
  events,
  onCellClick,
  onEventClick,
}: {
  days: Date[];
  hours: number[];
  events: CalendarEvent[];
  onCellClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="min-w-[1000px]">
      <div className="grid grid-cols-[74px_repeat(7,minmax(130px,1fr))] border-b-2 border-black dark:border-white bg-background">
        <div />
        {days.map((date) => (
          <div key={date.toISOString()} className="flex h-20 flex-col items-center justify-center">
            <span className="text-sm font-bold text-black dark:text-white">{dayLabels[date.getDay()]}</span>
            <span className="text-2xl font-bold text-black dark:text-white">{date.getDate()}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[74px_repeat(7,minmax(130px,1fr))] gap-[2px] bg-black dark:bg-white border-2 border-black dark:border-white">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="h-16 bg-background pr-3 pt-2 text-right text-xs font-bold text-black dark:text-white">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            {days.map((date) => {
              const cellEvents = events.filter((event) => {
                const start = new Date(event.startTime);
                return sameDay(start, date) && start.getHours() === hour;
              });
              return (
                <div
                  key={`${date.toISOString()}-${hour}`}
                  onClick={() => onCellClick(date, hour)}
                  role="button"
                  tabIndex={0}
                  className="relative h-16 cursor-pointer bg-background p-1 text-left transition-colors hover:bg-muted/40"
                >
                  {cellEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onEventClick(event);
                      }}
                      className="w-full rounded-md bg-[#58bfca] px-2 py-1 text-left text-xs font-semibold leading-5 text-white shadow-sm hover:brightness-105"
                    >
                      <div className="truncate">{event.title}</div>
                      <div className="truncate font-medium opacity-90">
                        {new Date(event.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventDrawer({
  draft,
  isSaving,
  activeChannels,
  onChange,
  onClose,
  onSave,
}: {
  draft: DraftEvent;
  isSaving: boolean;
  activeChannels: Channel[];
  onChange: (draft: DraftEvent) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <h2 className="text-lg font-semibold">{draft.id ? "Edit event" : "New event"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close event drawer">
          <X className="size-5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <Input
          className="h-12 text-lg"
          placeholder="Add a title"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <Clock className="size-4 text-muted-foreground" />
            <Input
              type="date"
              value={formatDateInput(draft.date)}
              onChange={(event) => onChange({ ...draft, date: new Date(`${event.target.value}T00:00:00`) })}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pl-7">
            <Input type="time" value={draft.startTime} onChange={(event) => onChange({ ...draft, startTime: event.target.value })} />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="time" value={draft.endTime} onChange={(event) => onChange({ ...draft, endTime: event.target.value })} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UserPlus className="size-4 text-muted-foreground" />
          <Input placeholder="Add guests" value={draft.guests} onChange={(event) => onChange({ ...draft, guests: event.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="size-4 text-muted-foreground" />
          <Input placeholder="Add a location" value={draft.location} onChange={(event) => onChange({ ...draft, location: event.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <Select value={draft.channelId || "none"} onValueChange={(channelId) => onChange({ ...draft, channelId })}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Calendar" />
            </SelectTrigger>
            <SelectContent>
              {activeChannels.length > 0 ? (
                activeChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.email_address || channel.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none">No selected calendar</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-3 rounded-md px-1 py-1">
          <Video className="size-4 text-muted-foreground" />
          <Checkbox
            checked={draft.generateMeetLink}
            onCheckedChange={(checked) => onChange({ ...draft, generateMeetLink: checked === true })}
          />
          <span className="text-sm">Add video conference</span>
        </label>
        <Textarea
          className="min-h-32"
          placeholder="Add a description"
          value={draft.description}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
        />
        <p className="pl-7 text-xs text-muted-foreground">{formatDateLabel(draft.date)}</p>
      </div>
      <div className="flex justify-end gap-3 border-t border-border p-5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} disabled={isSaving || !draft.title.trim()}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </aside>
  );
}

function EventPreview({
  event,
  channel,
  onClose,
  onEdit,
  onDelete,
  onMail,
  onCopy,
}: {
  event: CalendarEvent;
  channel?: Channel;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMail: () => void;
  onCopy: () => void;
}) {
  const start = new Date(event.startTime);

  return (
    <div className="absolute right-[410px] top-32 z-40 w-[500px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl">
      <div className="flex items-center justify-end gap-1 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit event">
          <Edit3 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete event">
          <Trash2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onMail} aria-label="Mail event">
          <Mail className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCopy} aria-label="Copy event ID">
          <Copy className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close event preview">
          <X className="size-5" />
        </Button>
      </div>
      <div className="space-y-5 px-6 py-6">
        <div className="flex items-center gap-4">
          <span className="size-3 rounded-sm bg-[#1fa7b5]" />
          <h3 className="text-xl font-semibold">{event.title || "(Untitled event)"}</h3>
        </div>
        <div className="grid gap-4 text-sm">
          <div className="flex gap-4">
            <Clock className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
              <p className="text-muted-foreground">{formatTimeRange(event)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="size-4 text-muted-foreground" />
            <span>30 minutes before</span>
          </div>
          <div className="flex items-center gap-4">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="truncate">{channel?.email_address || channel?.name || "Calendar"}</span>
          </div>
          {event.meetingLink && (
            <div className="flex items-center gap-4">
              <Video className="size-4 text-muted-foreground" />
              <a className="truncate text-primary hover:underline" href={event.meetingLink} target="_blank" rel="noreferrer">
                {event.meetingLink}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
