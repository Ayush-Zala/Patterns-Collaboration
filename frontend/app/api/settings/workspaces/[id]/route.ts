import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/workspaces/${id}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error(`[API] Error fetching workspace:`, error);
    return NextResponse.json({ error: "Unable to load workspace." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/workspaces/${id}`), {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error(`[API] Error updating workspace:`, error);
    return NextResponse.json({ error: "Unable to update workspace." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/workspaces/${id}`), {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error(`[API] Error deleting workspace:`, error);
    return NextResponse.json({ error: "Unable to delete workspace." }, { status: 503 });
  }
}
