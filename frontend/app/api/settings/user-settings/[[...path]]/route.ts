import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl } from "@/lib/backend-proxy";
import { getRequestSession } from "@/lib/auth-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const p = await params;
  return proxyRequest(request, p.path || [], "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const p = await params;
  return proxyRequest(request, p.path || [], "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const p = await params;
  return proxyRequest(request, p.path || [], "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const p = await params;
  return proxyRequest(request, p.path || [], "DELETE");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const p = await params;
  return proxyRequest(request, p.path || [], "PATCH");
}

async function proxyRequest(request: NextRequest, pathArray: string[], method: string) {
  try {
    const session = await getRequestSession(request);
    if (!session || !session.session.activeOrganizationId) {
      return NextResponse.json({ error: "Unauthorized or missing org context" }, { status: 401 });
    }

    const pathString = pathArray.join("/");
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const query = searchParams ? `?${searchParams}` : "";

    const backendUrl = resolveBackendUrl(`/user-settings${pathString ? `/${pathString}` : ""}${query}`);

    const headers = new Headers();
    headers.set("x-user-id", session.user.id);
    headers.set("x-org-id", session.session.activeOrganizationId);
    headers.set("Content-Type", "application/json");

    let body;
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await request.text();
      } catch (e) {
        // No body
      }
    }

    const response = await fetch(backendUrl, {
      method,
      headers,
      body: body ? body : undefined,
    });

    const responseData = await response.text();
    let json;
    try {
      json = JSON.parse(responseData);
    } catch {
      return new NextResponse(responseData, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("[UserSettings Proxy Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
