"use client";

import { useMemo } from "react";
import type React from "react";
import {
  Activity,
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  InboxIcon,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12am";
  if (i < 12) return `${i}am`;
  if (i === 12) return "12pm";
  return `${i - 12}pm`;
});

function fmt(ms: number, unit: "min" | "h" | "s" = "min"): string {
  if (unit === "s") return `${Math.round(ms / 1000)}s`;
  if (unit === "min") return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

// ─── Tiny components ──────────────────────────────────────────────────────────

function Badge({ text, colour }: { text: string; colour: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        colour
      )}
    >
      {text}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  delay?: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* glow blob */}
      <div
        className={cn(
          "absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20",
          accent
        )}
      />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            accent.replace("bg-", "bg-").replace("-500", "-500/15")
          )}
        >
          <Icon className={cn("h-5 w-5", accent.replace("bg-", "text-"))} />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground/60">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// Sparkline mini-bar chart
function MiniBarChart({
  data,
  labels,
  colour = "bg-primary",
  labelEvery = 1,
}: {
  data: number[];
  labels: string[];
  colour?: string;
  labelEvery?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="mt-3">
      <div className="flex items-end gap-0.5 h-20">
        {data.map((v, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center">
            <div
              className={cn(
                "w-full rounded-t transition-all duration-500 group-hover:opacity-80",
                colour
              )}
              style={{ height: `${pct(v, max)}%`, minHeight: v > 0 ? 2 : 0 }}
            />
            {/* Tooltip */}
            <div className="absolute -top-6 hidden group-hover:block z-10 rounded bg-popover border border-border px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm whitespace-nowrap">
              {labels[i]}: {v}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between">
        {labels.map((l, i) =>
          i % labelEvery === 0 ? (
            <span key={i} className="text-[9px] text-muted-foreground">
              {l}
            </span>
          ) : (
            <span key={i} />
          )
        )}
      </div>
    </div>
  );
}

// Progress ring
function RingMetric({
  label,
  value,
  total,
  colour,
}: {
  label: string;
  value: number;
  total: number;
  colour: string;
}) {
  const p = pct(value, total);
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (p / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="72" height="72" className="-rotate-90">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="6"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={colour}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-foreground">
          {p}%
        </span>
      </div>
      <span className="text-center text-xs text-muted-foreground leading-tight max-w-16">
        {label}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { snapshot, loading, error, connected, refetch } = useAnalytics();
  const { workload, efficiency, busiest, inboxes, team, calendar, updatedAt } =
    snapshot;



  const inboxList = useMemo(
    () =>
      Object.entries(inboxes).map(([id, m]) => ({
        id,
        label: id.slice(0, 8),
        ...m,
      })),
    [inboxes]
  );

  const teamList = useMemo(
    () =>
      Object.entries(team).map(([id, m]) => ({
        id,
        label: id.slice(0, 8),
        ...m,
      })),
    [team]
  );

  const updatedAgo = useMemo(() => {
    const d = new Date(updatedAt);
    const secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 5) return "just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }, [updatedAt]);

  // Peak hour
  const peakHour = useMemo(() => {
    const max = Math.max(...busiest.messages_by_hour);
    const idx = busiest.messages_by_hour.indexOf(max);
    return { label: HOUR_LABELS[idx], count: max };
  }, [busiest]);

  // Peak day
  const peakDay = useMemo(() => {
    const max = Math.max(...busiest.messages_by_day);
    const idx = busiest.messages_by_day.indexOf(max);
    return { label: DAY_LABELS[idx], count: max };
  }, [busiest]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <BarChart2 className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
              Event-driven metrics · updated {updatedAgo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500">Offline</span>
              </>
            )}
          </div>

          <button
            onClick={refetch}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <span className="ml-auto text-xs text-amber-500/70">
              Showing demo data · start the backend server to see real metrics
            </span>
          </div>
        )}

        {/* ── Workload KPIs ── */}
        <section>
          <SectionHeading
            icon={Activity}
            title="Workload"
            sub="Conversation volume and assignment state"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={MessageSquare}
              label="New"
              value={workload.new_conversations}
              sub="Conversations created"
              accent="bg-violet-500"
              delay={0}
            />
            <StatCard
              icon={InboxIcon}
              label="Open"
              value={workload.open_conversations}
              sub="Currently open"
              accent="bg-blue-500"
              delay={50}
            />
            <StatCard
              icon={Users}
              label="Assigned"
              value={workload.assigned_conversations}
              sub="Assigned to agents"
              accent="bg-emerald-500"
              delay={100}
            />
            <StatCard
              icon={AlertCircle}
              label="Unassigned"
              value={workload.unassigned_conversations}
              sub="Needs attention"
              accent="bg-amber-500"
              delay={150}
            />
            <StatCard
              icon={TrendingUp}
              label="Backlog"
              value={workload.backlog}
              sub="Pending resolution"
              accent="bg-rose-500"
              delay={200}
            />
          </div>
        </section>

        {/* ── Efficiency ── */}
        <section>
          <SectionHeading
            icon={Zap}
            title="Efficiency"
            sub="Response and resolution speed"
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Clock}
              label="Avg First Response"
              value={
                efficiency.avg_first_response_min < 1
                  ? "< 1m"
                  : `${efficiency.avg_first_response_min}m`
              }
              sub={`${fmt(efficiency.avg_first_response_ms, "s")} · ${efficiency.avg_first_response_ms > 0 ? "tracked" : "no data yet"}`}
              accent="bg-sky-500"
              delay={0}
            />
            <StatCard
              icon={CheckCircle2}
              label="Avg Resolution"
              value={`${efficiency.avg_resolution_hours}h`}
              sub={efficiency.avg_resolution_ms > 0 ? "time to close" : "no data yet"}
              accent="bg-teal-500"
              delay={50}
            />
            <StatCard
              icon={MessageSquare}
              label="Replies / Conv."
              value={efficiency.avg_replies_per_conversation}
              sub="Average messages to close"
              accent="bg-indigo-500"
              delay={100}
            />
          </div>

          {/* Assignment rings */}
          {workload.open_conversations > 0 && (
            <div className="mt-4 flex items-center gap-8 rounded-2xl border border-border/40 bg-card/80 p-5">
              <RingMetric
                label="Assigned"
                value={workload.assigned_conversations}
                total={workload.open_conversations}
                colour="hsl(142 71% 45%)"
              />
              <RingMetric
                label="Unassigned"
                value={workload.unassigned_conversations}
                total={workload.open_conversations}
                colour="hsl(38 92% 50%)"
              />
              <div className="ml-4 space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">
                    {workload.open_conversations}
                  </span>{" "}
                  open conversations total
                </p>
                <p className="text-xs">
                  {pct(workload.assigned_conversations, workload.open_conversations)}% are assigned to an agent
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Busiest Times ── */}
        <section>
          <SectionHeading
            icon={Clock}
            title="Busiest Times"
            sub="Message volume distribution (UTC)"
          />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* By hour */}
            <div className="rounded-2xl border border-border/40 bg-card/80 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">By Hour</p>
                {peakHour.count > 0 && (
                  <Badge
                    text={`Peak: ${peakHour.label} (${peakHour.count})`}
                    colour="bg-violet-500/15 text-violet-500"
                  />
                )}
              </div>
              <MiniBarChart
                data={busiest.messages_by_hour}
                labels={HOUR_LABELS}
                colour="bg-violet-500"
                labelEvery={4}
              />
            </div>
            {/* By day */}
            <div className="rounded-2xl border border-border/40 bg-card/80 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">By Day of Week</p>
                {peakDay.count > 0 && (
                  <Badge
                    text={`Peak: ${peakDay.label} (${peakDay.count})`}
                    colour="bg-blue-500/15 text-blue-500"
                  />
                )}
              </div>
              <MiniBarChart
                data={busiest.messages_by_day}
                labels={DAY_LABELS}
                colour="bg-blue-500"
                labelEvery={1}
              />
            </div>
          </div>
        </section>

        {/* ── Inbox Analytics ── */}
        <section>
          <SectionHeading
            icon={InboxIcon}
            title="Inbox Analytics"
            sub="Workload breakdown per inbox"
          />
          <div className="mt-4 rounded-2xl border border-border/40 bg-card/80 overflow-hidden">
            {inboxList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <InboxIcon className="h-8 w-8 opacity-30" />
                <p className="text-sm">No inbox data yet</p>
                <p className="text-xs">Data appears as threads flow through inboxes</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Inbox
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Open
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Assigned
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Unassigned
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Closed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inboxList.map((row, i) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        i !== inboxList.length - 1 && "border-b border-border/30"
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary/60" />
                          {row.label}…
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {row.open}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-500">
                        {row.assigned}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-500">
                        {row.unassigned}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {row.closed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Team Analytics ── */}
        <section>
          <SectionHeading
            icon={Users}
            title="Team Analytics"
            sub="Per-agent workload"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {teamList.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card/80 py-12 text-muted-foreground">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-sm">No team data yet</p>
                <p className="text-xs">Data appears when threads are assigned</p>
              </div>
            ) : (
              teamList.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-border/40 bg-card/80 p-4 text-center"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {m.label.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground truncate">
                    {m.id}
                  </p>
                  <div className="mt-2 flex justify-center gap-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">{m.open}</span>{" "}
                      open
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">{m.closed}</span>{" "}
                      closed
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Calendar ── */}
        <section className="pb-6">
          <SectionHeading
            icon={Calendar}
            title="Calendar & Meetings"
            sub="Meeting lifecycle metrics"
          />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <StatCard
              icon={Calendar}
              label="Meetings Scheduled"
              value={calendar.meetings_scheduled}
              accent="bg-violet-500"
              delay={0}
            />
            <StatCard
              icon={CheckCircle2}
              label="Meetings Completed"
              value={calendar.meetings_completed}
              accent="bg-emerald-500"
              delay={50}
            />
            <StatCard
              icon={AlertCircle}
              label="Meetings Cancelled"
              value={calendar.meetings_cancelled}
              accent="bg-rose-500"
              delay={100}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
