"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { io, type Socket } from "socket.io-client";
import { useQueryState } from "nuqs";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, CheckCircle2, Inbox as InboxIcon, Archive, Clock, MoreHorizontal, PenSquare, ArrowLeft, SendHorizontal, LayoutTemplate, RotateCcw, Building2, User, Link2, RefreshCw, Filter, MessageSquare, ChevronDown, Search, Plus, X, Trash, AlertCircle, ShieldAlert, Ban, MailOpen, Printer, Copy, Link as LinkIcon, Sparkles, Paperclip, ExternalLink, XCircle, Check, ChevronRight, Tag, ArrowUpDown, Lock } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useWorkspaceStore } from "@/context/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { authClient } from "@/lib/auth-client";
import type { ConversationFilter, MockConversation, MockMessage, ThreadStatus } from "@/lib/mock-inbox-data";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

type InboxApiResponse = {
  source: "backend" | "mock";
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  conversations: MockConversation[];
  fetchedAt: string;
};

type ApiError = {
  error?: string;
};

type TypingEvent = {
  thread_id?: string;
  user_id?: string;
  name?: string;
  is_typing?: boolean;
};

type InboxSummaryResponse = {
  inbox?: {
    id: string;
    name: string;
  };
  error?: string;
};

type DelegationAccessScope = {
  mode: "admin" | "fallback_full" | "delegated_all_sections" | "delegated_specific_inboxes";
  delegated: boolean;
  has_full_access: boolean;
  inbox_ids: string[];
  channel_ids: string[];
};

type DelegationAccessResponse = {
  scope?: DelegationAccessScope;
  inboxes?: Array<{ id: string; name: string }>;
};

const CONVERSATION_PAGE_SIZE = 6;
const THREAD_PAGE_SIZE = 4;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

const FALLBACK_ASSIGNEE_OPTIONS: Array<{ value: string; label: string }> = [];

const STATUS_OPTIONS: { value: ThreadStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
  { value: "snoozed", label: "Snoozed" },
];

async function fetchWithUser(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init);
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiError;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

import { usePreferences } from "@/context/preferences-context";

export function MessagesInbox() {
  const { prefs } = usePreferences();
  const { data: session } = authClient.useSession();
  const { data: orgData } = authClient.useActiveOrganization();
  const activeUserId = session?.user?.id || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedInboxId = searchParams.get("inboxId")?.trim() || "";
  const scopedChannelId = searchParams.get("channelId")?.trim() || "";
  const activeViewId = searchParams.get("viewId")?.trim() || "";

  // Active view filter criteria (populated when viewId is in URL)
  const [activeViewData, setActiveViewData] = useState<{
    name: string;
    inboxIds: string[];
    includeTags: string[];
    excludeTags: string[];
    assigneeIds: string[];
  } | null>(null);

  const [searchInput, setSearchInput] = useQueryState("search", { defaultValue: "" });
  const debouncedSearch = useDebounce(searchInput, 400);
  const [filter, setFilter] = useQueryState("filter", { defaultValue: "all" });

  const [scopedInboxName, setScopedInboxName] = useState<string | null>(null);

  const [conversationPage, setConversationPage] = useState(1);
  const [conversationTotalPages, setConversationTotalPages] = useState(1);
  const [conversations, setConversations] = useState<MockConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const [threadPage, setThreadPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [typingNotice, setTypingNotice] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string>("");
  const [dataSource, setDataSource] = useState<"backend" | "mock">("backend");
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "comment">("reply");
  const [accessScope, setAccessScope] = useState<DelegationAccessScope | null>(null);
  const [accessibleInboxes, setAccessibleInboxes] = useState<Array<{ id: string; name: string }>>([]);
  const [assigneeOptions, setAssigneeOptions] =
    useState<Array<{ value: string; label: string }>>(FALLBACK_ASSIGNEE_OPTIONS);
  const [threadViewMode, setThreadViewMode] = useState<"messages" | "activity" | "details">("messages");
  const [isUpdatingSnooze, setIsUpdatingSnooze] = useState(false);
  const [isTrashing, setIsTrashing] = useState(false);

  const [activeSort, setActiveSort] = useQueryState("sort", { defaultValue: "newest" });
  const [activeTag, setActiveTag] = useQueryState("tag", { defaultValue: "" });
  const [activeAssigneeId, setActiveAssigneeId] = useQueryState("assigneeId", { defaultValue: "" });
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useQueryState("status", { defaultValue: "open" });
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [channels, setChannels] = useState<{ id: string; name: string; email_address: string }[]>([]);
  const [selectedFromAddress, setSelectedFromAddress] = useState<string>("");
  const [macros, setMacros] = useState<any[]>([]);
  const [isExecutingMacro, setIsExecutingMacro] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const joinedChannelsRef = useRef<Set<string>>(new Set());
  const joinRoomsRef = useRef<() => void>(() => { });

  // Sentinel for infinite scroll
  const conversationListEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (isLoading || conversationPage >= conversationTotalPages) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setConversationPage(prev => prev + 1);
      }
    }, { threshold: 0.1 });

    if (conversationListEndRef.current) {
      observerRef.current.observe(conversationListEndRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [isLoading, conversationPage, conversationTotalPages]);

  useEffect(() => {
    if (threadViewMode === "activity") {
      setComposerMode("comment");
    } else if (threadViewMode === "messages") {
      setComposerMode("reply");
    }
  }, [threadViewMode]);


  // Fetch view filter criteria when viewId is in URL
  useEffect(() => {
    if (!activeViewId || !orgData?.id) {
      setActiveViewData(null);
      return;
    }
    fetch(`/api/settings/views/${activeViewId}`, {
      headers: { "x-org-id": orgData.id },
      cache: "no-store",
    })
      .then((r) => r.ok ? r.json() : null)
      .then((view) => {
        if (view) {
          setActiveViewData({
            name: view.name,
            inboxIds: view.inboxIds || [],
            includeTags: view.includeTags || [],
            excludeTags: view.excludeTags || [],
            assigneeIds: view.assigneeIds || [],
          });
        } else {
          setActiveViewData(null);
        }
      })
      .catch(() => setActiveViewData(null));
  }, [activeViewId, orgData?.id]);

  const safeFormatDistance = (dateStr: string | null | undefined) => {
    if (!dateStr) return "just now";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "just now";
    try {
      return formatDistanceToNowStrict(date, { addSuffix: false });
    } catch {
      return "just now";
    }
  };

  const safeFormat = (dateStr: string | null | undefined, formatStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    
    let finalFormat = formatStr;
    if (prefs?.timeFormat === "24h") {
      finalFormat = finalFormat.replace("h:mm a", "HH:mm");
    }

    try {
      return format(date, finalFormat);
    } catch {
      return "N/A";
    }
  };

  const getAuthorName = useCallback((id: string) => {
    return assigneeOptions.find(o => o.value === id)?.label || id;
  }, [assigneeOptions]);

  const { scopeType, scopeId, setScope } = useWorkspaceStore();
  const loadRequestIdRef = useRef(0);

  const fetchWithUser = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const fetchHeaders = {
        ...(options.headers || {}),
        "x-scope-type": scopeType,
        "x-scope-id": scopeId,
        ...(orgData?.id ? { "x-org-id": orgData.id } : {}),
      };

      return fetch(url, {
        ...options,
        headers: fetchHeaders,
      });
    },
    [scopeType, scopeId, orgData?.id]
  );

  // Fetch channels for From dropdown
  useEffect(() => {
    fetchWithUser("/api/settings/channels", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.channels) {
          setChannels(data.channels);
          if (data.channels.length > 0) {
            setSelectedFromAddress(prev => prev || data.channels[0].email_address);
          }
        }
      })
      .catch(() => setChannels([]));
  }, [fetchWithUser]);

  const loadConversations = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++loadRequestIdRef.current;

      if (!silent) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsRefreshing(true);
      }

      const params = new URLSearchParams({
        page: "1",
        pageSize: silent ? (conversationPage * 10).toString() : "10",
        search: debouncedSearch,
        filter,
        scope_type: scopeType || "company",
        scope_id: scopeId || "global",
        sort: activeSort,
        tag: activeTag || "",
        assignee_id: activeAssigneeId || "",
        status: activeStatusFilter,
      });
      if (scopedInboxId) {
        params.set("inboxId", scopedInboxId);
      }
      if (scopedChannelId) {
        params.set("channel_id", scopedChannelId);
      }
      // Apply view filter criteria if a view is active
      if (activeViewData) {
        if (activeViewData.inboxIds.length > 0) {
          params.set("channel_ids", activeViewData.inboxIds.join(","));
        }
        if (activeViewData.includeTags.length > 0) {
          params.set("tag", activeViewData.includeTags[0]); // primary include tag
        }
        if (activeViewData.assigneeIds.length > 0) {
          params.set("assignee_id", activeViewData.assigneeIds[0]); // primary assignee (OR logic)
        }
      }

      try {
        console.log(`[Inbox] Loading conversations (req ${requestId})...`, params.toString());
        const response = await fetchWithUser(`/api/inbox/threads?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          let errorMsg = `Inbox fetch failed with status ${response.status}`;
          try {
            const errorData = await response.json();
            console.error("[Inbox] 500 Error Details:", errorData);
            if (errorData.message) errorMsg += `: ${errorData.message}`;
          } catch {
            // ignore parse error
          }
          throw new Error(errorMsg);
        }

        const payload: InboxApiResponse = await response.json();

        // Prevent stale updates
        if (requestId !== loadRequestIdRef.current) {
          console.warn(`[Inbox] Ignoring stale response for req ${requestId}`);
          return;
        }

        const conversations = payload.conversations || [];
        console.log(`[Inbox] Loaded ${conversations.length} conversations for req ${requestId}`);

        if (silent || conversationPage === 1) {
          setConversations(conversations);
        } else {
          setConversations(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newConvs = conversations.filter(c => !existingIds.has(c.id));
            return [...prev, ...newConvs];
          });
        }
        setConversationTotalPages(payload.totalPages);
        setLastFetchedAt(payload.fetchedAt);
        setDataSource(payload.source);

        setSelectedConversationId((current) => {
          if (current && conversations.some((item) => item.id === current)) {
            return current;
          }
          return conversations[0]?.id ?? null;
        });
      } catch (fetchError) {
        console.error(`[Inbox] Load error (req ${requestId}):`, fetchError);
        if (requestId === loadRequestIdRef.current) {
          setError(fetchError instanceof Error ? fetchError.message : "Unexpected error while loading inbox.");
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [conversationPage, debouncedSearch, filter, scopedInboxId, scopedChannelId, scopeType, scopeId, activeSort, activeTag, activeAssigneeId, activeStatusFilter, fetchWithUser, activeViewData]
  );

  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const pollId = window.setInterval(() => {
      void loadConversations({ silent: true });
    }, 10_000);

    return () => window.clearInterval(pollId);
  }, [loadConversations]);

  useEffect(() => {
    setConversationPage(1);
  }, [debouncedSearch, filter, scopedInboxId, scopedChannelId, activeSort, activeTag, activeAssigneeId, activeStatusFilter]);

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/tags", {
        headers: {
          "x-scope-type": "all",
        }
      });
      if (res.ok) {
        const tags = await res.json();
        setAvailableTags(tags.map((t: any) => ({ ...t, scope: t.scopeType })));
      }
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    let isMounted = true;
    async function loadMacros() {
      try {
        const res = await fetchWithUser("/api/rules");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMacros((data.rules || []).filter((r: any) => {
              try {
                const trigs = JSON.parse(r.triggers || '[]');
                return trigs.some((t: any) => t.type === 'manual_macro');
              } catch {
                return false;
              }
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load macros:", err);
      }
    }
    loadMacros();
    return () => { isMounted = false; };
  }, [fetchWithUser]);

  useEffect(() => {
    let isMounted = true;

    async function loadScopedInboxName() {
      if (!scopedInboxId) {
        setScopedInboxName(null);
        return;
      }

      try {
        const response = await fetchWithUser(`/api/settings/inboxes/${scopedInboxId}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as InboxSummaryResponse;
        if (!isMounted) return;
        if (response.ok && payload.inbox?.name) {
          setScopedInboxName(payload.inbox.name);
          return;
        }
        setScopedInboxName(null);
      } catch {
        if (!isMounted) return;
        setScopedInboxName(null);
      }
    }

    void loadScopedInboxName();

    return () => {
      isMounted = false;
    };
  }, [scopedInboxId]);

  useEffect(() => {
    let isMounted = true;

    async function loadAccessScope() {
      try {
        const response = await fetchWithUser("/api/inbox/access", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as DelegationAccessResponse;
        if (!isMounted) return;
        if (!response.ok) {
          setAccessScope(null);
          setAccessibleInboxes([]);
          return;
        }
        setAccessScope(payload.scope || null);
        setAccessibleInboxes(payload.inboxes || []);
      } catch {
        if (!isMounted) return;
        setAccessScope(null);
        setAccessibleInboxes([]);
      }
    }

    void loadAccessScope();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignableUsers() {
      try {
        const response = await fetch("/api/settings/users?scope=assignable", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          users?: Array<{ id: string; name: string; email: string }>;
        };

        if (!isMounted || !response.ok) {
          return;
        }

        setAssigneeOptions(
          (payload.users || []).map((user) => ({
            value: user.id,
            label: user.name || user.email,
          }))
        );
      } catch {
        if (!isMounted) return;
        setAssigneeOptions(FALLBACK_ASSIGNEE_OPTIONS);
      }
    }

    void loadAssignableUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const markRead = () => {
      setReadMap((current) => ({ ...current, [selectedConversationId]: true }));
    };

    if (prefs.markAsRead === "never") return;

    if (prefs.markAsRead === "after5s") {
      const timer = setTimeout(markRead, 5000);
      return () => clearTimeout(timer);
    }

    // Default or "immediately" / "onOpen"
    markRead();
  }, [selectedConversationId, prefs.markAsRead]);

  const prevSelectionRef = useRef<{ id: string | null; isComposing: boolean }>({ id: null, isComposing: false });

  useEffect(() => {
    const selectionChanged = prevSelectionRef.current.id !== selectedConversationId || prevSelectionRef.current.isComposing !== isComposing;

    if (selectionChanged) {
      setThreadPage(1);
      setReplyBody("");
      if (!isComposing) {
        setToInput(selectedConversation?.senderContact || "");
        setCcInput("");
        setShowCc(false);
        setComposeSubject("");
      } else {
        // If we just switched TO composing, ensure fields are fresh
        setToInput("");
        setCcInput("");
        setComposeSubject("");
      }
      setTypingNotice(null);
      prevSelectionRef.current = { id: selectedConversationId, isComposing };
    }
  }, [selectedConversationId, isComposing, selectedConversation]);

  const selectedMessages = useMemo(() => selectedConversation?.messages ?? [], [selectedConversation]);
  const selectedComments = useMemo(() => selectedConversation?.comments ?? [], [selectedConversation]);

  const interleavedItems = useMemo(() => {
    const items = [
      ...selectedMessages.map(m => ({ ...m, type: 'message' as const })),
      ...selectedComments.map(c => ({ ...c, type: 'comment' as const, sentAt: c.createdAt })),
    ];
    return items.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [selectedMessages, selectedComments]);

  const threadTotalPages = Math.max(1, Math.ceil(interleavedItems.length / THREAD_PAGE_SIZE));

  useEffect(() => {
    if (threadPage > threadTotalPages) {
      setThreadPage(threadTotalPages);
    }
  }, [threadPage, threadTotalPages]);

  const pagedItems = useMemo(() => {
    const start = (threadPage - 1) * THREAD_PAGE_SIZE;
    return interleavedItems.slice(start, start + THREAD_PAGE_SIZE);
  }, [interleavedItems, threadPage]);

  const channelIds = useMemo(() => {
    return [...new Set(conversations.map((conversation) => conversation.channelId).filter(Boolean) as string[])];
  }, [conversations]);

  const joinRooms = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    for (const channelId of channelIds) {
      if (joinedChannelsRef.current.has(channelId)) continue;
      socket.emit("join_channel", { channel_id: channelId, scope_type: scopeType, scope_id: scopeId });
      joinedChannelsRef.current.add(channelId);
    }

    if (selectedConversationIdRef.current) {
      socket.emit("join_thread", { thread_id: selectedConversationIdRef.current, scope_type: scopeType, scope_id: scopeId });
    }
  }, [channelIds, scopeType, scopeId]);

  useEffect(() => {
    joinRoomsRef.current = joinRooms;
    joinRooms();
  }, [joinRooms]);

  useEffect(() => {
    if (!activeUserId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: {
        user_id: activeUserId,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
      joinedChannelsRef.current = new Set();
      joinRoomsRef.current();
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("WebSocket connection error:", err);
      setIsSocketConnected(false);
    });

    socket.on("assignment", (payload: { thread_id: string; assigned_to: string | null }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === payload.thread_id ? { ...conv, assignedTo: payload.assigned_to } : conv
        )
      );
    });

    socket.on("new_message", (message: any) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === message.thread_id);
        if (index === -1) return prev;

        const conv = prev[index];
        const mappedMsg = {
          id: message.id,
          from: message.from,
          to: (message.to || []).join(", "),
          sentAt: message.received_at,
          body: message.body_text || message.body_html || "",
          raw: message,
        };

        if (conv.messages.some((m) => m.id === message.id)) return prev;

        const updatedConv = {
          ...conv,
          snippet: (message.body_text || "New message").slice(0, 160),
          lastActivityAt: message.received_at,
          messages: [...conv.messages, mappedMsg].sort(
            (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          ),
          unreadCount: message.direction === "inbound" ? conv.unreadCount + 1 : conv.unreadCount,
        };

        const next = [...prev];
        next.splice(index, 1);
        next.unshift(updatedConv);
        return next;
      });
    });

    socket.on("typing", (payload: TypingEvent) => {
      if (!payload.thread_id || payload.thread_id !== selectedConversationIdRef.current) return;
      if (!payload.user_id || payload.user_id === activeUserId) return;
      setTypingNotice(payload.is_typing ? `${payload.name || "Someone"} is typing...` : null);
    });

    socket.on("comment_added", (comment: any) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === comment.thread_id);
        if (index === -1) return prev;

        const conv = prev[index];
        const mappedComment = {
          id: comment.id,
          authorId: comment.author_id,
          body: comment.body,
          createdAt: comment.created_at,
        };

        if (conv.comments?.some((c) => c.id === comment.id)) return prev;

        const updatedConv = {
          ...conv,
          lastActivityAt: comment.created_at,
          comments: [...(conv.comments || []), mappedComment],
        };

        const next = [...prev];
        next.splice(index, 1);
        next.unshift(updatedConv);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
    };
  }, [activeUserId]);

  const emitTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    const threadId = selectedConversationIdRef.current;
    if (!socket || !threadId) return;
    socket.emit("typing", {
      thread_id: threadId,
      is_typing: isTyping,
    });
  }, []);

  const onReplyInputChange = useCallback(
    (value: string) => {
      setReplyBody(value);
      if (!selectedConversation) return;
      emitTyping(true);
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      typingStopTimerRef.current = window.setTimeout(() => {
        emitTyping(false);
      }, 1200);
    },
    [emitTyping, selectedConversation]
  );

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([
      loadConversations({ silent: true }),
      loadTags()
    ]);
  }, [loadConversations, loadTags]);

  const updateAssignment = useCallback(
    async (value: string) => {
      if (!selectedConversation) return;
      setActionError(null);
      setIsUpdatingAssignment(true);

      try {
        const response = await fetchWithUser(`/api/inbox/threads/${selectedConversation.id}/assign`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            assigned_to: value === "unassigned" ? null : value,
          }),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to update assignee."));
        }
        await refreshAfterMutation();
      } catch (mutationError) {
        setActionError(
          mutationError instanceof Error ? mutationError.message : "Assignment could not be updated right now."
        );
      } finally {
        setIsUpdatingAssignment(false);
      }
    },
    [selectedConversation, fetchWithUser, refreshAfterMutation]
  );

  const executeMacro = useCallback(
    async (macroId: string) => {
      if (!selectedConversation) return;
      setActionError(null);
      setIsExecutingMacro(true);

      try {
        const res = await fetch(`/api/rules/${macroId}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: selectedConversation.id }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Failed to execute macro");
        }

        toast.success("Macro executed successfully");
        await refreshAfterMutation();
      } catch (err: any) {
        console.error("[Macro] Execution error:", err);
        setActionError(err.message || "Failed to execute macro");
        toast.error("Failed to execute macro");
      } finally {
        setIsExecutingMacro(false);
      }
    },
    [selectedConversation, refreshAfterMutation]
  );

  const updateStatus = useCallback(
    async (value: ThreadStatus) => {
      if (!selectedConversation) return;
      setActionError(null);
      setIsUpdatingStatus(true);

      try {
        const response = await fetchWithUser(`/api/inbox/threads/${selectedConversation.id}/status`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            status: value,
          }),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to update status."));
        }
        await refreshAfterMutation();
      } catch (mutationError) {
        setActionError(mutationError instanceof Error ? mutationError.message : "Status could not be updated right now.");
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [refreshAfterMutation, selectedConversation]
  );

  const snoozeThread = useCallback(
    async (until: Date | null) => {
      if (!selectedConversation) return;
      setActionError(null);
      setIsUpdatingSnooze(true);

      try {
        const response = await fetchWithUser(`/api/inbox/threads/${selectedConversation.id}/snooze`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            snoozed_until: until ? until.toISOString() : null,
          }),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to snooze thread."));
        }
        await refreshAfterMutation();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Thread could not be snoozed.");
      } finally {
        setIsUpdatingSnooze(false);
      }
    },
    [refreshAfterMutation, selectedConversation]
  );

  const trashThread = useCallback(
    async () => {
      if (!selectedConversation) return;
      setActionError(null);
      setIsTrashing(true);

      try {
        const response = await fetchWithUser(`/api/inbox/threads/${selectedConversation.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, "Failed to delete thread."));
        }
        setSelectedConversationId(null);
        await refreshAfterMutation();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Thread could not be deleted.");
      } finally {
        setIsTrashing(false);
      }
    },
    [refreshAfterMutation, selectedConversation]
  );

  const toggleTag = useCallback(
    async (tagName: string) => {
      if (!selectedConversation) return;

      const currentTags = selectedConversation.tags || [];
      const isAdding = !currentTags.includes(tagName);
      const newTags = isAdding
        ? [...currentTags, tagName]
        : currentTags.filter(t => t !== tagName);

      // --- OPTIMISTIC UPDATE: update UI immediately ---
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id ? { ...c, tags: newTags } : c
        )
      );

      try {
        const response = await fetchWithUser(`/api/inbox/threads/${selectedConversation.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tags: newTags }),
        });

        if (!response.ok) {
          // Roll back optimistic update on failure
          setConversations(prev =>
            prev.map(c =>
              c.id === selectedConversation.id ? { ...c, tags: currentTags } : c
            )
          );
          const errorMsg = await readApiError(response, "Failed to update tags.");
          console.error(`[Tagging] API Error: ${errorMsg}`);
          setActionError(errorMsg);
        }
        // Silently refresh in background so subsequent reloads are consistent
        void loadConversations({ silent: true });
      } catch (err) {
        // Roll back on network error
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id ? { ...c, tags: currentTags } : c
          )
        );
        console.error(`[Tagging] Exception:`, err);
        setActionError(err instanceof Error ? err.message : "Tags could not be updated.");
      }
    },
    [selectedConversation, fetchWithUser, setConversations, loadConversations]
  );


  const sendReply = useCallback(async () => {
    if (!selectedConversation && !isComposing) return;
    const body = replyBody.trim();
    if (!body) return;

    const originalBody = replyBody;
    setReplyBody("");
    setActionError(null);
    setIsSendingReply(true);
    emitTyping(false);

    try {
      let endpoint = "";
      let payload: any = {};

      if (isComposing) {
        endpoint = "/api/inbox/threads";
        payload = {
          from: selectedFromAddress || session?.user?.email || "sales@company.com",
          to: toInput.split(",").map(e => e.trim()).filter(Boolean),
          cc: ccInput.split(",").map(e => e.trim()).filter(Boolean),
          subject: composeSubject || "(no subject)",
          body_text: body,
          direction: "outbound"
        };
      } else {
        endpoint = composerMode === "reply"
          ? `/api/inbox/threads/${selectedConversation!.id}/reply`
          : `/api/comments`;

        payload = composerMode === "reply"
          ? {
            from: selectedFromAddress || session?.user?.email || selectedConversation!.channelEmail || "sales@company.com",
            sender_name: session?.user?.name || null,
            to: toInput.split(",").map(e => e.trim()).filter(Boolean),
            cc: ccInput.split(",").map(e => e.trim()).filter(Boolean),
            body_text: body,
            attachments: [],
          }
          : {
            thread_id: selectedConversation!.id,
            body: body,
          };
      }

      const response = await fetchWithUser(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, `Message could not be sent.`));
      }

      if (isComposing) {
        setIsComposing(false);
        setComposeSubject("");
        setToInput("");
      }
      await refreshAfterMutation();

      // Auto-archive if preference enabled
      if (!isComposing && composerMode === "reply" && prefs?.sendButtonBehavior === "sendAndArchive") {
        void updateStatus("closed");
      }
    } catch (replyError) {
      setReplyBody(originalBody);
      setActionError(replyError instanceof Error ? replyError.message : `Message could not be sent.`);
    } finally {
      setIsSendingReply(false);
    }
  }, [emitTyping, refreshAfterMutation, replyBody, selectedConversation, composerMode, isComposing, toInput, ccInput, composeSubject, session, selectedFromAddress]);

  const actionsDisabled = dataSource !== "backend";

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-background">
      {/* LEFT PANEL: CONVERSATIONS LIST */}
      <div className="flex w-[320px] lg:w-[360px] flex-col border-r border-border bg-card shrink-0">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-foreground transition-all flex-shrink-0">
              <LayoutTemplate className="size-4" />
            </div>
            <div className="h-4 w-px bg-muted/80 mx-1 flex-shrink-0" />
            <h2 className="text-sm font-bold text-foreground truncate">
              {scopedChannelId
                ? (channels.find(c => c.id === scopedChannelId)?.name || channels.find(c => c.id === scopedChannelId)?.email_address || "My Channel")
                : (scopedInboxName || "Demo Inbox")}
            </h2>

            <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("size-8 text-muted-foreground hover:text-foreground rounded-lg", (activeTag || activeAssigneeId) && "text-indigo-400 bg-indigo-500/10")}>
                    <Filter className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-popover border-border text-popover-foreground">
                  <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Filter by</div>
                  <DropdownMenuSeparator className="bg-muted/50" />

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="hover:bg-muted focus:bg-muted">
                      <Tag className="mr-2 size-4 text-muted-foreground" />
                      <span className="font-medium">Tags</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-popover border-border text-popover-foreground min-w-40">
                        <DropdownMenuItem onClick={() => setActiveTag(null)} className="flex items-center justify-between">
                          <span className="font-medium">All Tags</span>
                          {!activeTag && <Check className="size-3 text-indigo-400" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-muted/50" />
                        {availableTags.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No tags found</div>
                        ) : (
                          availableTags.map(tag => (
                            <DropdownMenuItem key={tag.id} onClick={() => setActiveTag(tag.name)} className="flex items-center justify-between">
                              <span className="font-medium">{tag.name}</span>
                              {activeTag === tag.name && <Check className="size-3 text-indigo-400" />}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="hover:bg-muted focus:bg-muted">
                      <User className="mr-2 size-4 text-muted-foreground" />
                      <span className="font-medium">Assignees</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-popover border-border text-popover-foreground min-w-40">
                        <DropdownMenuItem onClick={() => setActiveAssigneeId(null)} className="flex items-center justify-between">
                          <span className="font-medium">All Assignees</span>
                          {!activeAssigneeId && <Check className="size-3 text-indigo-400" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-muted/50" />
                        {assigneeOptions.map(opt => (
                          <DropdownMenuItem key={opt.value} onClick={() => setActiveAssigneeId(opt.value)} className="flex items-center justify-between">
                            <span className="font-medium">{opt.label}</span>
                            {activeAssigneeId === opt.value && <Check className="size-3 text-indigo-400" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground rounded-lg">
                    <ArrowUpDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-popover border-border text-popover-foreground">
                  {[
                    { value: "newest", label: "Newest" },
                    { value: "oldest", label: "Oldest" },
                    { value: "newest_unreplied", label: "Newest unreplied" },
                    { value: "oldest_unreplied", label: "Oldest unreplied" },
                    { value: "closest_to_goal", label: "Closest to time goal" },
                  ].map(opt => (
                    <DropdownMenuItem key={opt.value} onClick={() => setActiveSort(opt.value)} className="flex items-center justify-between hover:bg-muted focus:bg-muted py-2">
                      <span className={cn("font-medium", activeSort === opt.value && "text-indigo-400")}>{opt.label}</span>
                      {activeSort === opt.value && <Check className="size-3.5 text-indigo-400" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/20 transition-all",
                isComposing && "bg-zinc-700 hover:bg-zinc-600 rotate-45"
              )}
              onClick={() => {
                setIsComposing(!isComposing);
                if (!isComposing) {
                  setSelectedConversationId(null);
                  setToInput("");
                  setCcInput("");
                  setReplyBody("");
                }
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1">
            {[
              { value: "unassigned", label: "Unassigned" },
              { value: "assigned", label: "Assigned" },
              { value: "snoozed", label: "Snoozed" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                onClick={() => setActiveStatusFilter(opt.value)}
                className={cn(
                  "h-7 px-2.5 text-[11px] font-bold rounded-md transition-all border",
                  activeStatusFilter === opt.value
                    ? "bg-muted border-border text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-muted-foreground hover:bg-muted/50"
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-popover-foreground">
              <DropdownMenuItem onClick={() => setActiveStatusFilter("archived")} className="hover:bg-muted focus:bg-muted py-2">
                <Archive className="mr-2 size-4 text-muted-foreground" />
                <span className="font-medium">Archived</span>
                {activeStatusFilter === "archived" && <Check className="ml-auto size-3 text-indigo-400" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveStatusFilter("trash")} className="hover:bg-muted focus:bg-muted py-2">
                <Trash className="mr-2 size-4 text-muted-foreground" />
                <span className="font-medium">Trash</span>
                {activeStatusFilter === "trash" && <Check className="ml-auto size-3 text-indigo-400" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveStatusFilter("spam")} className="hover:bg-muted focus:bg-muted py-2">
                <AlertCircle className="mr-2 size-4 text-muted-foreground" />
                <span className="font-medium">Spam</span>
                {activeStatusFilter === "spam" && <Check className="ml-auto size-3 text-indigo-400" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-muted/50" />
              <DropdownMenuItem onClick={() => {
                setActiveStatusFilter("open");
                setActiveTag(null);
                setActiveAssigneeId(null);
                setActiveSort("newest");
              }} className="text-muted-foreground hover:text-muted-foreground">
                <RefreshCw className="mr-2 size-3.5" />
                <span className="text-xs">Reset filters</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>



        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading && <p className="p-4 text-xs text-muted-foreground text-center">Loading...</p>}
            {!isLoading && conversations.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <InboxIcon className="size-5 text-muted-foreground/40" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                    {scopedInboxId
                      ? "This inbox has no threads. Start by composing a message or sending an internal note to your team."
                      : "This inbox is currently empty."}
                  </p>
                </div>
                {scopedInboxId && (
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setSelectedConversationId(null);
                    }}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-xs font-semibold transition-all"
                  >
                    <Plus className="size-3.5" />
                    Compose first message
                  </button>
                )}
              </div>
            )}
            {!isLoading && conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId;
              const unreadCount = readMap[conversation.id] ? 0 : conversation.unreadCount;

              return (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setIsComposing(false);
                  }}
                  className={cn(
                    "w-full text-left rounded-xl border transition-all relative group",
                    prefs.density === "compact" ? "p-2" : prefs.density === "comfortable" ? "p-4" : "p-3",
                    isActive
                      ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                      : "bg-transparent border-transparent hover:bg-muted/50"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={cn("text-sm font-semibold truncate pr-2", isActive ? "text-indigo-700 dark:text-indigo-100" : "text-foreground")}>
                      {conversation.sender}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-medium text-muted-foreground">
                      <span>{safeFormatDistance(conversation.lastActivityAt)}</span>
                      {conversation.status === "closed" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                    </div>
                  </div>
                  <p className={cn("text-xs font-medium truncate mb-1", isActive ? "text-indigo-600/80 dark:text-muted-foreground" : "text-muted-foreground")}>
                    {conversation.subject}
                  </p>
                  {prefs.density !== "compact" && (
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                      {conversation.snippet}
                    </p>
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex size-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  )}
                </button>
              );
            })}

            {/* Infinite Scroll Sentinel */}
            <div ref={conversationListEndRef} className="h-4 w-full" />

            {isLoading && conversationPage > 1 && (
              <p className="p-4 text-[10px] text-muted-foreground text-center animate-pulse">Loading more...</p>
            )}
          </div>
        </ScrollArea>

        {/* Footer info */}
        <div className="border-t border-border p-2 text-center flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "flex size-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
              isSocketConnected ? "bg-emerald-500" : "bg-zinc-600 shadow-none"
            )}></span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              {isSocketConnected ? "Live" : "Offline"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn(
              "text-[9px] h-4 px-1.5 border-border uppercase tracking-tighter",
              dataSource === "backend" ? "text-indigo-400" : "text-amber-500"
            )}>
              {dataSource === "backend" ? "Realtime" : "Mock Fallback"}
            </Badge>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: THREAD DETAIL */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-background">
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <h1 className="text-xl font-bold text-foreground truncate">{selectedConversation.subject}</h1>
                <div className="mt-2 flex items-center gap-3">
                  <Badge variant="outline" className="bg-card border-border text-muted-foreground gap-1.5 rounded-md px-2 py-0.5">
                    <InboxIcon className="size-3 text-pink-500" />
                    {scopedInboxName || "Team Inbox"}
                  </Badge>
                  {selectedConversation.assignedTo && (
                    <Badge variant="outline" className="bg-card border-border text-muted-foreground gap-1.5 rounded-md px-2 py-0.5">
                      <User className="size-3 text-indigo-400" />
                      Assigned
                    </Badge>
                  )}

                  {/* Tags Display */}
                  {(selectedConversation.tags || [])
                    .map(tagName => {
                      const tagInfo = availableTags.find(t => t.name === tagName);

                      return (

                        <Badge
                          key={tagName}
                          variant="outline"
                          className={cn(
                            "bg-card border-border text-muted-foreground gap-1.5 rounded-md px-2 py-0.5",
                            tagInfo?.color && `border-[${tagInfo.color}]/30`
                          )}
                          style={tagInfo?.color ? { borderColor: `${tagInfo.color}40`, color: tagInfo.color } : {}}
                        >
                          {tagInfo?.emoji && <span className="text-[10px]">{tagInfo.emoji}</span>}
                          {tagInfo?.scope === "individual" && <Lock className="size-2.5" />}
                          <span className="text-xs">{tagName}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tagName);
                            }}
                            className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-foreground/10 transition-colors opacity-60 hover:opacity-100"
                          >
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      );
                    })}

                  {/* Add Tag Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-6 rounded-md hover:bg-muted text-muted-foreground">
                        <Plus className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-64 p-0 bg-popover border-border shadow-2xl">
                      <Command className="bg-transparent">
                        <CommandInput placeholder="Search tags..." className="h-9 border-none focus:ring-0 text-sm" />
                        <CommandList>
                          <CommandGroup heading="Recent Tags">
                            {/* Mock recent tags or just show all for now */}
                            {availableTags.map(tag => {
                              const isSelected = selectedConversation.tags?.includes(tag.name);
                              const hasConflict = availableTags.filter(t => t.name === tag.name).length > 1;

                              return (
                                <CommandItem
                                  key={`${tag.scope}-${tag.id}`}
                                  value={tag.name}
                                  onSelect={() => toggleTag(tag.name)}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {tag.scope === "organization" && hasConflict && (
                                        <div className="size-4 rounded-sm bg-teal-600 flex items-center justify-center text-[8px] font-bold text-white uppercase">
                                          {orgData?.name?.charAt(0) || "W"}
                                        </div>
                                      )}
                                      {tag.emoji ? <span className="text-xs">{tag.emoji}</span> : <Tag className="size-3.5 text-muted-foreground" />}
                                    </div>
                                    <span className="truncate">{tag.name}</span>
                                    {tag.scope === "individual" && <Lock className="size-3 text-muted-foreground/50 shrink-0" />}
                                  </div>
                                  {isSelected && <Check className="size-3.5 text-indigo-400" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No tags found.</CommandEmpty>
                          <Separator className="bg-muted/50" />
                          <div className="p-1">
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-xs font-semibold text-primary h-8 gap-2"
                              onClick={() => router.push("/settings/tags")}
                            >
                              <Plus className="size-3" />
                              Create new tag
                            </Button>
                          </div>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* More Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
                    <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-400/10" onClick={trashThread} disabled={isTrashing}>
                      <Trash className="mr-2 size-4" />
                      <span>Trash</span>

                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { updateStatus("trashed"); }}>
                      <AlertCircle className="mr-2 size-4" />
                      <span>Mark as spam</span>

                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Phishing attempt reported")}>
                      <ShieldAlert className="mr-2 size-4" />
                      <span>Report phishing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success("Sender blocked successfully")}>
                      <Ban className="mr-2 size-4" />
                      <span>Block sender</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-muted" />
                    <DropdownMenuItem onClick={() => {
                      setReadMap((current) => ({ ...current, [selectedConversation.id]: false }));
                      toast.success("Conversation marked as unread");
                    }}>
                      <MailOpen className="mr-2 size-4" />
                      <span>Mark as unread</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.print()}>
                      <Printer className="mr-2 size-4" />
                      <span>Print</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-muted" />
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(selectedConversation.id)}>
                      <Copy className="mr-2 size-4" />
                      <span>Copy conversation ID</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
                      <LinkIcon className="mr-2 size-4" />
                      <span>Copy conversation URL</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-muted" />
                    <DropdownMenuItem className="text-indigo-400 focus:text-indigo-300" onClick={() => toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), { loading: 'Generating summary...', success: 'Summary copied to clipboard!' })}>
                      <Sparkles className="mr-2 size-4" />
                      <span>Summarize</span>

                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setThreadViewMode("details")}>
                      <span>View conversation details</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("No attachments found for this conversation")}>
                      <Paperclip className="mr-2 size-4" />
                      <span>View attachments</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/inbox/${selectedConversation.id}`, '_blank')}>
                      <ExternalLink className="mr-2 size-4" />
                      <span>View in external window</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-muted" />
                    <DropdownMenuItem onClick={() => updateStatus("closed")}>
                      <XCircle className="mr-2 size-4" />
                      <span>Close conversation</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Snooze Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-foreground hover:bg-muted", selectedConversation.status === "snoozed" && "text-amber-500 bg-amber-500/10")}>
                      <Clock className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0 bg-popover border-border text-popover-foreground shadow-2xl">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-bold">Snooze</span>
                      <Link href="/settings/snoozes/create">
                        <Settings className="size-4 text-muted-foreground hover:text-muted-foreground cursor-pointer" />
                      </Link>
                    </div>
                    <div className="p-1">
                      {[
                        { label: "Later today", time: "3:00 PM", date: "Tue, May 12, 2026", hours: 3 },
                        { label: "Tomorrow", time: "9:00 AM", date: "Tue, May 12, 2026", hours: 24 },
                        { label: "This week", time: "9:00 AM", date: "Wed, May 13, 2026", hours: 48 },
                        { label: "Next week", time: "9:00 AM", date: "Mon, May 18, 2026", hours: 168 },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 rounded-md transition-colors group"
                          onClick={() => {
                            const d = new Date();
                            d.setHours(d.getHours() + opt.hours);
                            snoozeThread(d);
                          }}
                        >
                          <span className="text-muted-foreground group-hover:text-foreground font-medium">{opt.label}</span>
                          <span className="text-indigo-400 font-mono text-[11px]">{opt.date}, {opt.time}</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-1 border-t border-border">
                      <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground">
                        <span>Day & Time</span>
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Assign Dropdown (Customized) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 bg-card border-border text-muted-foreground hover:bg-muted transition-colors gap-2">
                      <User className={cn("size-3.5", selectedConversation.assignedTo ? "text-indigo-400" : "text-muted-foreground")} />
                      <span className="text-xs font-semibold">
                        {selectedConversation.assignedTo ? getAuthorName(selectedConversation.assignedTo) : "Assign"}
                      </span>
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-0 bg-popover border-border text-popover-foreground shadow-2xl">
                    <div className="p-3 border-b border-border text-center">
                      <span className="text-sm font-bold">Assign</span>
                    </div>
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search" className="h-9 border-none focus:ring-0 text-sm" />
                      <CommandList>
                        <CommandEmpty>No teammate found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => updateAssignment("unassigned")}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Ban className="size-4 text-muted-foreground" />
                              <span>Unassigned</span>
                            </div>
                            {!selectedConversation.assignedTo && <Check className="size-4 text-indigo-500" />}
                          </CommandItem>
                        </CommandGroup>

                        <DropdownMenuSeparator className="bg-muted" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recently used</div>
                        <CommandGroup>
                          {assigneeOptions.slice(0, 2).map((opt) => (
                            <CommandItem
                              key={`recent-${opt.value}`}
                              onSelect={() => updateAssignment(opt.value)}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white relative">
                                  {opt.label.charAt(0)}
                                  <div className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 border-2 border-[#12141c]" />
                                </div>
                                <span>{opt.label}</span>
                              </div>
                              {selectedConversation.assignedTo === opt.value && <Check className="size-4 text-indigo-500" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>

                        <DropdownMenuSeparator className="bg-muted" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">All teammates</div>
                        <CommandGroup>
                          {assigneeOptions.map((opt) => (
                            <CommandItem
                              key={`all-${opt.value}`}
                              onSelect={() => updateAssignment(opt.value)}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                  {opt.label.charAt(0)}
                                </div>
                                <span>{opt.label}</span>
                              </div>
                              {selectedConversation.assignedTo === opt.value && <Check className="size-4 text-indigo-500" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Macros Dropdown */}
                {macros.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-8 bg-card border-border text-muted-foreground hover:bg-muted transition-colors gap-2">
                        <Sparkles className="size-3.5 text-amber-400" />
                        <span className="text-xs font-semibold">Macros</span>
                        <ChevronDown className="size-3 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Available Macros</div>
                      <DropdownMenuSeparator className="bg-muted" />
                      {macros.map(macro => (
                        <DropdownMenuItem 
                          key={macro.id} 
                          onClick={() => executeMacro(macro.id)}
                          disabled={isExecutingMacro}
                          className="cursor-pointer focus:bg-muted font-medium"
                        >
                          <Sparkles className="size-4 mr-2 text-amber-400" />
                          {macro.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Status Button */}
                <Button
                  onClick={() => updateStatus(selectedConversation.status === "closed" ? "open" : "closed")}
                  className={cn(
                    "h-8 gap-2 transition-all font-bold text-xs",
                    selectedConversation.status === "closed"
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                      : "bg-zinc-100 text-zinc-900 hover:bg-white"
                  )}
                  disabled={actionsDisabled || isUpdatingStatus}
                >
                  <CheckCircle2 className="size-3.5" />
                  {selectedConversation.status === "closed" ? "Reopen" : "Done"}
                </Button>
              </div>
            </div>

            {/* View Toggle Tabs */}
            <div className="flex items-center px-6 border-b border-border/20 bg-background">
              <button
                onClick={() => setThreadViewMode("messages")}
                className={cn(
                  "px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative",
                  threadViewMode === "messages" ? "text-indigo-400" : "text-muted-foreground hover:text-muted-foreground"
                )}
              >
                Messages
                {threadViewMode === "messages" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
              </button>
              <button
                onClick={() => setThreadViewMode("activity")}
                className={cn(
                  "px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative",
                  threadViewMode === "activity" ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground hover:text-muted-foreground"
                )}
              >
                Activity
                {threadViewMode === "activity" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-600 dark:bg-amber-500" />}
              </button>
              <button
                onClick={() => setThreadViewMode("details")}
                className={cn(
                  "px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative",
                  threadViewMode === "details" ? "text-emerald-500" : "text-muted-foreground hover:text-muted-foreground"
                )}
              >
                Details
                {threadViewMode === "details" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
              </button>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="max-w-4xl mx-auto space-y-8 p-6 lg:p-10">
                {threadViewMode === "details" && selectedConversation ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="noir-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Conversation Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Subject</p>
                            <p className="text-sm text-foreground mt-1">{selectedConversation.subject}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Created</p>
                            <p className="text-sm text-foreground mt-1">{safeFormat(selectedConversation.lastActivityAt, "PPP p")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">ID</p>
                            <code className="text-[10px] text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded mt-1 block">{selectedConversation.id}</code>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="noir-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Participant</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground border border-border">
                              {selectedConversation.sender.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{selectedConversation.sender}</p>
                              <p className="text-xs text-muted-foreground">{selectedConversation.senderContact}</p>
                            </div>
                          </div>
                          <Separator className="bg-muted" />
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-border">Customer</Badge>
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Verified</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Metadata</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                            <Badge className="mt-1 capitalize">{selectedConversation.status}</Badge>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Assignee</p>
                            <p className="text-xs text-muted-foreground mt-1">{selectedConversation.assignedTo ? getAuthorName(selectedConversation.assignedTo) : "Unassigned"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Tags</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(selectedConversation.tags || []).map(t => <Badge key={t} variant="outline" className="text-[9px] px-1">{t}</Badge>)}
                              {(!selectedConversation.tags || selectedConversation.tags.length === 0) && <span className="text-xs text-muted-foreground italic">None</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Source</p>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <Building2 className="size-3 text-pink-500" />
                              {scopedInboxName || "Team Inbox"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {(threadViewMode === "messages" ? selectedMessages : selectedComments).map((item: any) => {
                      const isMessage = 'from' in item;
                      const userEmail = session?.user?.email;

                      // WhatsApp logic: Current user on right, others (teammates/customers) on left
                      const isSelf = isMessage
                        ? (item.from === userEmail || item.from.includes(userEmail || "NEVER_MATCH"))
                        : (item.authorId === activeUserId);

                      const sentAt = isMessage ? item.sentAt : item.createdAt;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          key={item.id}
                          className={cn("group flex flex-col", isSelf ? "items-end" : "items-start")}
                        >
                          {isMessage ? (
                            <div className={cn("max-w-[85%] flex gap-3", isSelf ? "flex-row-reverse" : "flex-row")}>
                              <div className={cn(
                                "size-8 rounded-full border flex items-center justify-center text-[10px] font-bold uppercase shrink-0 mt-1 shadow-sm",
                                isSelf ? "bg-indigo-600 border-indigo-500 text-white" : "bg-muted border-border text-muted-foreground"
                              )}>
                                {item.from.substring(0, 2)}
                              </div>
                              <div className={cn("flex flex-col gap-1.5", isSelf ? "items-end" : "items-start")}>
                                <div className={cn(
                                  "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                                  isSelf
                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-muted border border-border/80 text-foreground rounded-tl-none"
                                )}>
                                  {item.body}
                                </div>
                                <div className={cn("flex items-center gap-2 px-1", isSelf ? "justify-end" : "justify-start")}>
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    {safeFormat(sentAt, "h:mm a")}
                                  </span>
                                  {!isSelf && (
                                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">
                                      via {item.from.split("<")[1]?.replace(">", "") || item.from}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={cn("w-full flex my-1", isSelf ? "justify-end" : "justify-start")}>
                              <div className={cn(
                                "max-w-[80%] bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-2xl p-4 relative overflow-hidden group/note",
                                isSelf ? "rounded-tr-none" : "rounded-tl-none"
                              )}>
                                <div className={cn("absolute top-0 w-1 h-full bg-amber-500/40", isSelf ? "right-0" : "left-0")} />
                                <div className="flex items-center justify-between mb-2 gap-4">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="size-3.5 text-amber-600 dark:text-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">Internal Note</span>
                                    <span className="text-xs font-semibold text-muted-foreground ml-2">{getAuthorName(item.authorId)}</span>
                                  </div>
                                  <time className="text-[10px] font-medium text-muted-foreground shrink-0">
                                    {safeFormatDistance(sentAt)} ago
                                  </time>
                                </div>
                                <div className="text-sm text-amber-900 dark:text-amber-200/80 leading-relaxed italic whitespace-pre-wrap">
                                  {item.body}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {!isComposerOpen && !isComposing && (
                <div className="sticky bottom-0 p-6 flex justify-center pointer-events-none">
                  <div className="pointer-events-auto">
                    <Button
                      onClick={() => {
                        setIsComposerOpen(true);
                        setComposerMode(threadViewMode === "activity" ? "comment" : "reply");
                      }}
                      className={cn(
                        "border rounded-full px-6 py-2 h-10 shadow-2xl flex items-center gap-2 group transition-all hover:scale-105 active:scale-95",
                        threadViewMode === "activity"
                          ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200"
                          : "bg-card hover:bg-muted border-border/80 text-muted-foreground"
                      )}
                    >
                      {threadViewMode === "activity" ? (
                        <MessageSquare className="size-4 text-amber-500 group-hover:scale-110 transition-transform" />
                      ) : (
                        <RotateCcw className="size-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
                      )}
                      <span className="text-sm font-bold tracking-tight">
                        {threadViewMode === "activity" ? "Add a note" : `Reply to ${selectedConversation?.sender || "Conversation"}`}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Bottom Composer */}
            {(isComposerOpen || isComposing) && (
              <div className="absolute inset-x-0 bottom-0 z-50 p-4 lg:p-10 pointer-events-none">
                <div className="max-w-4xl mx-auto pointer-events-auto animate-in slide-in-from-bottom-8 duration-300">
                  <div className={cn(
                    "bg-card border rounded-2xl overflow-hidden transition-all shadow-xl",
                    composerMode === "reply" ? "focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/10" : "border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/10"
                  )}>
                    <div className="flex items-center gap-1 p-2 bg-muted/50 border-b border-border/80">
                      <button
                        onClick={() => {
                          setComposerMode("reply");
                          setThreadViewMode("messages");
                        }}
                        className={cn(
                          "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                          composerMode === "reply" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-muted-foreground hover:text-muted-foreground"
                        )}
                      >
                        {isComposing ? "New Message" : "Reply"}
                      </button>
                      {!isComposing && (
                        <button
                          onClick={() => {
                            setComposerMode("comment");
                            setThreadViewMode("activity");
                          }}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                            composerMode === "comment" ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-muted-foreground hover:text-muted-foreground"
                          )}
                        >
                          Comment
                        </button>
                      )}
                      <div className="ml-auto pr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => {
                            setIsComposerOpen(false);
                            setIsComposing(false);
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {composerMode === "reply" && (
                      <div className="flex flex-col gap-3 p-4 bg-muted/30 border-b border-border/80">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">From</span>
                          <Select value={selectedFromAddress || session?.user?.email || selectedConversation?.channelEmail || "sales@company.com"} onValueChange={setSelectedFromAddress}>
                            <SelectTrigger className="h-7 border-0 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-mono text-[11px] shadow-none w-auto max-w-sm hover:bg-indigo-500/20 transition-colors">
                              <SelectValue placeholder="Select sender..." />
                            </SelectTrigger>
                            <SelectContent>
                              {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.email_address} className="font-mono text-[11px]">
                                  {channel.name} ({channel.email_address})
                                </SelectItem>
                              ))}
                              {channels.length === 0 && (
                                <SelectItem value={session?.user?.email || selectedConversation?.channelEmail || "sales@company.com"} className="font-mono text-[11px]">
                                  {session?.user?.email || selectedConversation?.channelEmail || "sales@company.com"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">To</span>
                              <Input
                                value={toInput}
                                onChange={(e) => setToInput(e.target.value)}
                                placeholder="recipient@example.com"
                                className="h-7 bg-muted/50 border-border text-foreground px-3 rounded-full font-medium text-[11px] flex-1 focus-visible:ring-indigo-500/20"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-muted-foreground hover:text-muted-foreground ml-2"
                              onClick={() => setShowCc(!showCc)}
                            >
                              {showCc ? "Hide Cc" : "Add Cc"}
                            </Button>
                          </div>
                        </div>
                        {showCc && (
                          <div className="flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                            <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">Cc</span>
                            <Input
                              value={ccInput}
                              onChange={(e) => setCcInput(e.target.value)}
                              placeholder="cc@example.com"
                              className="h-7 bg-muted/50 border-border text-foreground px-3 rounded-full font-medium text-[11px] flex-1 focus-visible:ring-indigo-500/20"
                            />
                          </div>
                        )}
                        {isComposing && (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">Subject</span>
                            <Input
                              value={composeSubject}
                              onChange={(e) => setComposeSubject(e.target.value)}
                              placeholder="Message subject..."
                              className="h-7 bg-muted/50 border-border text-foreground px-3 rounded-full font-medium text-[11px] flex-1 focus-visible:ring-indigo-500/20"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <textarea
                      value={replyBody}
                      onChange={(e) => onReplyInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && prefs?.enterToSend) {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                      onPaste={(e) => {
                        if (prefs?.pasteAsText) {
                          e.preventDefault();
                          const text = e.clipboardData.getData("text/plain");
                          // Insert plain text at cursor
                          const start = e.currentTarget.selectionStart;
                          const end = e.currentTarget.selectionEnd;
                          const value = e.currentTarget.value;
                          const newValue = value.substring(0, start) + text + value.substring(end);
                          onReplyInputChange(newValue);
                          // We can't easily set selection back here without a ref, 
                          // but insertText is often available or we can just append
                        }
                      }}
                      placeholder={isComposing ? "Type your new message..." : (composerMode === "reply" ? "Type your reply to the customer..." : "Add internal comment visible to teammates...")}
                      className="w-full bg-transparent p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px] max-h-[300px]"
                      disabled={actionsDisabled || isSendingReply}
                    />
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border/80">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full">
                          <Link2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full">
                          <User className="size-4" />
                        </Button>
                        <span className="text-[11px] font-medium text-muted-foreground ml-2">{typingNotice || (actionsDisabled ? "Read Only" : "Draft saved")}</span>
                      </div>
                      <Button
                        onClick={() => void sendReply()}
                        disabled={!replyBody.trim() || actionsDisabled || isSendingReply}
                        className={cn(
                          "h-9 font-medium px-5 rounded-lg shadow-lg transition-all active:scale-95 flex items-center",
                          composerMode === "reply"
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                            : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20"
                        )}
                      >
                        {composerMode === "reply" ? <SendHorizontal className="size-4 mr-2" /> : <MessageSquare className="size-4 mr-2" />}
                        {isSendingReply ? "Sending..." : (isComposing ? "Send Message" : (composerMode === "reply" ? "Reply" : "Post Note"))}
                      </Button>
                    </div>
                  </div>
                  {actionError && <p className="text-xs text-red-400 mt-2 font-medium px-2">{actionError}</p>}
                </div>
              </div>
            )}
          </>
        ) : isComposing ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <h1 className="text-xl font-bold text-foreground truncate">New Message</h1>
                <p className="text-xs text-muted-foreground mt-1">Start a new conversation with a customer</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsComposing(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col justify-end">
              {/* Reuse composer logic below */}
              <div className="px-4 py-3 lg:px-10 lg:py-4 bg-background">
                <div className="max-w-4xl mx-auto">
                  <div className={cn(
                    "bg-card border rounded-2xl overflow-hidden transition-all shadow-xl",
                    "focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/10"
                  )}>
                    <div className="flex items-center gap-1 p-2 bg-muted/50 border-b border-border/80">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                        New Message
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 p-4 bg-muted/30 border-b border-border/80">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">From</span>
                        <Select value={selectedFromAddress || session?.user?.email || "sales@company.com"} onValueChange={setSelectedFromAddress}>
                          <SelectTrigger className="h-7 border-0 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-mono text-[11px] shadow-none w-auto max-w-sm hover:bg-indigo-500/20 transition-colors">
                            <SelectValue placeholder="Select sender..." />
                          </SelectTrigger>
                          <SelectContent>
                            {channels.map((channel) => (
                              <SelectItem key={channel.id} value={channel.email_address} className="font-mono text-[11px]">
                                {channel.name} ({channel.email_address})
                              </SelectItem>
                            ))}
                            {channels.length === 0 && (
                              <SelectItem value={session?.user?.email || "sales@company.com"} className="font-mono text-[11px]">
                                {session?.user?.email || "sales@company.com"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">To</span>
                            <Input
                              value={toInput}
                              onChange={(e) => setToInput(e.target.value)}
                              placeholder="recipient@example.com"
                              className="h-7 bg-muted/50 border-border text-foreground px-3 rounded-full font-medium text-[11px] flex-1 focus-visible:ring-indigo-500/20"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-muted-foreground hover:text-muted-foreground ml-2"
                            onClick={() => setShowCc(!showCc)}
                          >
                            {showCc ? "Hide Cc" : "Add Cc"}
                          </Button>
                        </div>
                      </div>
                      {showCc && (
                        <div className="flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                          <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">Cc</span>
                          <Input
                            value={ccInput}
                            onChange={(e) => setCcInput(e.target.value)}
                            placeholder="cc@example.com"
                            className="h-7 bg-muted/50 border-border text-foreground px-3 rounded-full font-medium text-[11px] flex-1 focus-visible:ring-indigo-500/20"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground w-10 font-bold uppercase tracking-tighter opacity-50">Subject</span>
                        <Input
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Message subject..."
                          className="h-7 bg-muted/50 border-border text-foreground px-3 rounded-full font-medium text-[11px] flex-1 focus-visible:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <textarea
                      value={replyBody}
                      onChange={(e) => onReplyInputChange(e.target.value)}
                      placeholder="Type your new message..."
                      className="w-full bg-transparent p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[120px] max-h-[400px]"
                      disabled={actionsDisabled || isSendingReply}
                    />
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border/80">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full">
                          <Link2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full">
                          <User className="size-4" />
                        </Button>
                      </div>
                      <Button
                        onClick={() => void sendReply()}
                        disabled={!replyBody.trim() || !toInput.trim() || actionsDisabled || isSendingReply}
                        className="h-9 font-medium px-5 rounded-lg shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 transition-all active:scale-95 flex items-center"
                      >
                        <SendHorizontal className="size-4 mr-2" />
                        {isSendingReply ? "Sending..." : "Send Message"}
                      </Button>
                    </div>
                  </div>
                  {actionError && <p className="text-xs text-red-400 mt-2 font-medium px-2">{actionError}</p>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col bg-background">
            {/* Main Header for Empty State */}
            <div className="flex h-14 items-center justify-between px-8 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-muted-foreground hover:text-foreground transition-all">
                  <LayoutTemplate className="size-4" />
                </div>
                <h1 className="text-sm font-bold text-foreground capitalize">{filter.replace("-", " ")}</h1>
              </div>
            </div>

            {scopedInboxId && conversations.length === 0 && !isLoading ? (
              // Context-aware empty state for a specific inbox with no threads
              <div className="flex-1 flex items-center justify-center flex-col text-center p-8">
                <div className="relative mb-8">
                  <div className="absolute -inset-6 bg-indigo-500/8 rounded-full blur-3xl" />
                  <div className="relative size-32 bg-muted/50 border border-border rounded-[2.5rem] flex items-center justify-center shadow-xl overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-amber-500/5" />
                    <InboxIcon className="size-12 text-muted-foreground/30" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-foreground tracking-tight mb-2">Inbox is empty</h3>
                <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed mb-2">
                  No emails or threads yet. Start the conversation or send an internal note to your teammates.
                </p>
                <p className="text-xs text-muted-foreground/60 mb-8">
                  Teammates delegated to this inbox will see messages you send here.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setSelectedConversationId(null);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <Plus className="size-3.5" />
                    Compose Message
                  </button>
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setSelectedConversationId(null);
                      setComposerMode("comment");
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition-all active:scale-95"
                  >
                    <MessageSquare className="size-3.5" />
                    Internal Note
                  </button>
                </div>
              </div>
            ) : (
              // Standard "Inbox Zero" state
              <div className="flex-1 flex items-center justify-center flex-col text-center p-8">
                {/* Sub-tabs for Empty State */}
                <div className="flex items-center gap-2 mb-8">
                  {["All", "Conversations", "Tasks", "Discussions"].map((tab) => (
                    <button
                      key={tab}
                      className={cn(
                        "px-3 py-1 text-[11px] font-bold rounded-md border transition-all",
                        tab === "All" ? "bg-muted border-border text-foreground" : "bg-transparent border-border text-muted-foreground hover:text-muted-foreground"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="relative mb-10 group">
                  <div className="absolute -inset-6 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-700" />
                  <div className="relative size-40 bg-muted/50 border border-border rounded-[3rem] flex items-center justify-center shadow-2xl overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                    <div className="flex flex-col gap-2 items-center">
                      <div className="w-10 h-10 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/30 animate-bounce duration-[2000ms]" />
                      <div className="w-12 h-12 bg-purple-500/80 rounded-full shadow-lg shadow-purple-500/30" />
                      <div className="w-20 h-6 bg-muted/80 rounded-lg" />
                    </div>
                  </div>
                  <div className="absolute -right-3 -bottom-3 size-10 bg-muted border border-border rounded-2xl flex items-center justify-center text-foreground shadow-xl font-bold text-sm">
                    ✨
                  </div>
                </div>

                <h3 className="text-3xl font-black text-foreground tracking-tight mb-2">Way to go!</h3>
                <p className="text-lg text-muted-foreground font-semibold mb-1">Your Inbox is clear 🙌</p>
                <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
                  Keep up the good work! All conversations in <span className="text-muted-foreground font-bold">{filter.replace("-", " ")}</span> are handled.
                </p>

                <div className="mt-10 flex items-center gap-2 px-6 py-2.5 bg-card/40 border border-border rounded-full backdrop-blur-md">
                  <div className="size-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Inbox Zero achieved</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

