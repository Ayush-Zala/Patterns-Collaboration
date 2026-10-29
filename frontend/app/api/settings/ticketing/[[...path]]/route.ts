import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl, getBackendHeaders } from "@/lib/backend-proxy";

async function proxyRequest(request: NextRequest, pathArray: string[], method: string) {
  try {
    const backendHeaders = await getBackendHeaders(request);
    
    // Check if we have an org context
    if (!backendHeaders["x-org-id"]) {
      console.warn("[Ticketing Proxy] Missing organization context");
      return NextResponse.json({ error: "Missing organization context" }, { status: 401 });
    }

    const pathString = pathArray.join("/");
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const query = searchParams ? `?${searchParams}` : "";

    const backendUrl = resolveBackendUrl(`/ticketing${pathString ? `/${pathString}` : ""}${query}`);

    const headers = new Headers();
    Object.entries(backendHeaders).forEach(([k, v]) => headers.set(k, v));
    headers.set("Content-Type", "application/json");

    let body;
    if (method !== "GET" && method !== "DELETE") {
      body = await request.text();
    }

    const res = await fetch(backendUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[Ticketing Proxy] Error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path || [], "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path || [], "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path || [], "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path || [], "DELETE");
}
