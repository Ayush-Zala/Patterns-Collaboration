import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, resolveBackendUrl } from "@/lib/backend-proxy";
import type { ConversationFilter, MockConversation } from "@/lib/mock-inbox-data";

type BackendThreadSummary = {
  id: string;
  channelId: string;
  subject: string;
  participants: string[];
  status: "open" | "pending" | "closed" | "snoozed" | "trashed";
  assignedTo: string | null;
  lastActivityAt: string;
  createdAt: string;
};

type BackendMessage = {
  id: string;
  from: string;
  to: string[];
  received_at: string;
  body_text: string;
  body_html: string;
  direction: "inbound" | "outbound";
  [key: string]: unknown;
};

type BackendComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  [key: string]: unknown;
};

type BackendThreadDetail = {
  id: string;
  channelId: string;
  subject: string;
  participants: string[];
  messages: BackendMessage[];
  comments: BackendComment[];
  tags: string[];
  status: "open" | "pending" | "closed" | "snoozed" | "trashed";
  assignedTo: string | null;
  assignmentState?: string;
  priority?: string;
  snoozedUntil?: string | null;
  scopeType?: string;
  scopeId?: string;
  lastActivityAt: string;
  createdAt: string;
};

type BackendChannel = {
  id: string;
  email_address: string;
};

const DEFAULT_PAGE_SIZE = 6;
const STATUS_FILTERS = new Set(["open", "pending", "closed", "snoozed"]);
const ASSIGNMENT_FILTERS = new Set(["assigned", "unassigned"]);

async function fetchFromBackend(url: string, request: NextRequest) {
  const headers = await getBackendHeaders(request);
  console.log(`[fetchFromBackend] fetching ${url} with headers:`, JSON.stringify(headers));
  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Backend call failed with ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error(`[fetchFromBackend] fetch to ${url} threw an error:`, error.message, error.cause);
    throw error;
  }
}

function toMockConversation(thread: BackendThreadDetail, channelEmailById: Map<string, string>): MockConversation {
  const messages = [...thread.messages].sort(
    (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );
  const lastMessage = messages[messages.length - 1];
  const lastInbound = [...messages].reverse().find((message) => message.direction === "inbound");
  const sender = lastInbound?.from || thread.participants[0] || "Unknown Sender";
  const snippet = (lastMessage?.body_text || lastMessage?.body_html || "No message content").slice(0, 160);
  const unreadCount = lastMessage?.direction === "inbound" && thread.status !== "closed" ? 1 : 0;

  return {
    id: thread.id,
    channelId: thread.channelId,
    channelEmail: channelEmailById.get(thread.channelId),
    participants: thread.participants,
    sender,
    senderContact: sender,
    subject: thread.subject || "(no subject)",
    snippet,
    unreadCount,
    replyCount: messages.length,
    assignedTo: thread.assignedTo || null,
    assignmentState: thread.assignmentState,
    priority: thread.priority,
    snoozedUntil: thread.snoozedUntil || null,
    tags: Array.isArray(thread.tags) ? thread.tags : [],
    status: thread.status,
    lastActivityAt: thread.lastActivityAt,
    createdAt: thread.createdAt,
    messages: messages.map((message) => ({
      id: message.id,
      from: message.from,
      to: (message.to || []).join(", "),
      sentAt: message.received_at,
      body: message.body_text || message.body_html || "",
      raw: message,
    })),
    comments: (thread.comments || []).map((comment) => ({
      id: comment.id,
      authorId: comment.author_id,
      body: comment.body,
      createdAt: comment.created_at,
    })),
    scope: thread.scopeType,
  };
}

async function getBackendConversations(
  filter: ConversationFilter,
  search: string,
  request: NextRequest,
  inboxId: string,
  channelId: string,
  tag: string,
  assignee_id: string,
  status: string,
  sort: string
): Promise<MockConversation[]> {
  const backendQuery = new URLSearchParams();
  if (search) backendQuery.set("search", search);
  if (ASSIGNMENT_FILTERS.has(filter)) backendQuery.set("filter", filter);
  if (inboxId) backendQuery.set("inbox_id", inboxId);
  if (channelId) backendQuery.set("channel_id", channelId);
  if (tag) backendQuery.set("tag", tag);
  if (assignee_id) backendQuery.set("assignee_id", assignee_id);
  if (status) backendQuery.set("status", status);
  if (sort) backendQuery.set("sort", sort);
  backendQuery.set("scope_type", "all");

  console.log(`[InboxThreadsAPI] Fetching channels...`);
  let channelsPayload;
  try {
    channelsPayload = (await fetchFromBackend(resolveBackendUrl("/channels"), request)) as {
      channels: BackendChannel[];
    };
  } catch (err: any) {
    console.error("[InboxThreadsAPI] Channels fetch failed:", err);
    throw new Error(`Backend Channels fetch failed: ${err.message}`);
  }

  const channelEmailById = new Map<string, string>();
  (channelsPayload.channels || []).forEach((c) => {
    channelEmailById.set(c.id, c.email_address);
  });

  const listUrl = `${resolveBackendUrl("/threads")}${backendQuery.toString() ? `?${backendQuery.toString()}` : ""}`;
  console.log(`[InboxThreadsAPI] Fetching threads from ${listUrl}...`);
  
  let listPayload;
  try {
    listPayload = (await fetchFromBackend(listUrl, request)) as { threads: BackendThreadSummary[] };
  } catch (err: any) {
    console.error("[InboxThreadsAPI] Threads list fetch failed:", err);
    throw new Error(`Backend Threads list fetch failed: ${err.message}`);
  }

  let threads = listPayload.threads || [];
  console.log(`[InboxThreadsAPI] Found ${threads.length} threads in list`);

  if (STATUS_FILTERS.has(filter)) {
    threads = threads.filter((thread) => thread.status === filter);
  }

  console.log(`[InboxThreadsAPI] Fetching details for ${threads.length} threads...`);
  const details = await Promise.allSettled(
    threads.map(async (thread) => {
      try {
        const detailPayload = (await fetchFromBackend(resolveBackendUrl(`/threads/${thread.id}`), request)) as {
          thread: BackendThreadDetail;
        };
        return detailPayload.thread;
      } catch (err) {
        console.error(`[InboxThreadsAPI] Failed to fetch details for thread ${thread.id}:`, err);
        return null;
      }
    })
  );
  
  const validDetails = details
    .filter((d): d is PromiseFulfilledResult<BackendThreadDetail | null> => d.status === "fulfilled")
    .map(d => d.value)
    .filter((d): d is BackendThreadDetail => d !== null);

  return validDetails.map((thread) => toMockConversation(thread, channelEmailById)).sort((a, b) => {
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search") || "";
  const inboxId = searchParams.get("inboxId") || "";
  const tag = searchParams.get("tag") || "";
  const assignee_id = searchParams.get("assignee_id") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "";
  const filter = (searchParams.get("filter") || "all") as ConversationFilter;

  try {
    const channel_id = searchParams.get("channel_id") || "";
    console.log(`[InboxThreadsAPI] GET starting... filter=${filter}, search=${search}, tag=${tag}, assignee=${assignee_id}, status=${status}, sort=${sort}, channelId=${channel_id}`);
    const allConversations = await getBackendConversations(filter, search, request, inboxId, channel_id, tag, assignee_id, status, sort);
    console.log(`[InboxThreadsAPI] GET found ${allConversations.length} conversations`);
    
    const totalPages = Math.max(1, Math.ceil(allConversations.length / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const conversations = allConversations.slice(start, start + pageSize);

    return NextResponse.json({
      source: "backend",
      page: safePage,
      pageSize,
      totalPages,
      totalItems: allConversations.length,
      conversations,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[InboxThreadsAPI] GET CRITICAL ERROR:", error);
    return NextResponse.json({ 
      error: "Failed to fetch conversations", 
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scopeType = request.nextUrl.searchParams.get('scope_type') || request.headers.get('x-scope-type') || 'company';
    const scopeId = request.nextUrl.searchParams.get('scope_id') || request.headers.get('x-scope-id') || 'global';

    console.log(`[ScopeMiddleware] Parsed scope: type=${scopeType}, id=${scopeId} (from headers: type=${request.headers.get('x-scope-type')}, id=${request.headers.get('x-scope-id')})`);

    const headers = await getBackendHeaders(request);
    
    const response = await fetch(resolveBackendUrl("/threads"), {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText || "Backend error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("[InboxThreadsAPI] POST error:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
