import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(request: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  try {
    const params = await props.params;
    const pathSegments = params.path ? params.path.join("/") : "";
    const headers = await getBackendHeaders(request);
    
    const backendUrl = resolveBackendUrl(`/sequences/${pathSegments}${request.nextUrl.search}`);
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers,
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: "API Gateway Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  try {
    const params = await props.params;
    const pathSegments = params.path ? params.path.join("/") : "";
    const headers = await getBackendHeaders(request);
    const body = await request.json();

    const backendUrl = resolveBackendUrl(`/sequences/${pathSegments}${request.nextUrl.search}`);
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: "API Gateway Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  try {
    const params = await props.params;
    const pathSegments = params.path ? params.path.join("/") : "";
    const headers = await getBackendHeaders(request);
    const body = await request.json();

    const backendUrl = resolveBackendUrl(`/sequences/${pathSegments}${request.nextUrl.search}`);
    const backendResponse = await fetch(backendUrl, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: "API Gateway Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ path?: string[] }> }) {
  try {
    const params = await props.params;
    const pathSegments = params.path ? params.path.join("/") : "";
    const headers = await getBackendHeaders(request);

    const backendUrl = resolveBackendUrl(`/sequences/${pathSegments}${request.nextUrl.search}`);
    const backendResponse = await fetch(backendUrl, {
      method: "DELETE",
      headers,
    });
    
    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: "API Gateway Error" }, { status: 500 });
  }
}
