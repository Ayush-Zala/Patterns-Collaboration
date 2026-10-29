"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { authClient } from "@/lib/auth-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkloadMetrics {
  new_conversations: number;
  open_conversations: number;
  assigned_conversations: number;
  unassigned_conversations: number;
  backlog: number;
}

export interface EfficiencyMetrics {
  avg_first_response_ms: number;
  avg_first_response_min: number;
  avg_resolution_ms: number;
  avg_resolution_hours: number;
  avg_replies_per_conversation: number;
}

export interface BusiestMetrics {
  messages_by_hour: number[]; // length 24
  messages_by_day: number[];  // length 7
}

export interface InboxMetrics {
  open: number;
  assigned: number;
  unassigned: number;
  closed: number;
}

export interface TeamMemberMetrics {
  open: number;
  closed: number;
}

export interface CalendarMetrics {
  meetings_scheduled: number;
  meetings_completed: number;
  meetings_cancelled: number;
}

export interface AnalyticsSnapshot {
  workload: WorkloadMetrics;
  efficiency: EfficiencyMetrics;
  busiest: BusiestMetrics;
  inboxes: Record<string, InboxMetrics>;
  team: Record<string, TeamMemberMetrics>;
  calendar: CalendarMetrics;
  updatedAt: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultSnapshot: AnalyticsSnapshot = {
  workload: {
    new_conversations: 0,
    open_conversations: 0,
    assigned_conversations: 0,
    unassigned_conversations: 0,
    backlog: 0,
  },
  efficiency: {
    avg_first_response_ms: 0,
    avg_first_response_min: 0,
    avg_resolution_ms: 0,
    avg_resolution_hours: 0,
    avg_replies_per_conversation: 0,
  },
  busiest: {
    messages_by_hour: Array(24).fill(0),
    messages_by_day: Array(7).fill(0),
  },
  inboxes: {},
  team: {},
  calendar: {
    meetings_scheduled: 0,
    meetings_completed: 0,
    meetings_cancelled: 0,
  },
  updatedAt: new Date().toISOString(),
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const backendBase =
  (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000").replace(
    "localhost",
    "127.0.0.1"
  );

export function useAnalytics() {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(defaultSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch via our Next.js API proxy to properly resolve organization headers
      const resp = await fetch("/api/analytics/summary");
      if (!resp.ok) {
        throw new Error(`Analytics API returned ${resp.status}`);
      }

      const body = await resp.json();
      if (body?.data) {
        setSnapshot(body.data as AnalyticsSnapshot);
      }
      
      return body?.orgId; // Return the orgId so we can join the socket room
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to load analytics";
      console.warn("[useAnalytics] REST fetch failed:", errMsg);
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Wait for initial fetch to get the correct orgId from the backend proxy logic
      const resolvedOrgId = await fetchSnapshot();

      // Only connect to socket if we have an orgId
      const socket = io(backendBase, {
        query: { user_id: "u-admin-1" },
        transports: ["websocket", "polling"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        if (resolvedOrgId) {
          socket.emit("join_analytics", { org_id: resolvedOrgId });
        }
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("analytics_update", (payload: { snapshot: AnalyticsSnapshot }) => {
        if (payload?.snapshot) {
          setSnapshot(payload.snapshot);
        }
      });
    })();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [fetchSnapshot]);

  return { snapshot, loading, error, connected, refetch: fetchSnapshot };
}
