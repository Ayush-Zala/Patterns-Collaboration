import { NextRequest, NextResponse } from "next/server";

import { filterConversations, mockConversations, type ConversationFilter } from "@/lib/mock-inbox-data";

const DEFAULT_PAGE_SIZE = 6;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
  const search = searchParams.get("search") || "";
  const filter = (searchParams.get("filter") || "all") as ConversationFilter;

  const filtered = filterConversations(mockConversations, search, filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageData = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    page: safePage,
    pageSize,
    totalPages,
    totalItems: filtered.length,
    conversations: pageData,
    fetchedAt: new Date().toISOString(),
  });
}
