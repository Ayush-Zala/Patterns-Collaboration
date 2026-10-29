import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const headers = await getBackendHeaders(request);
    const response = await fetch(resolveBackendUrl(`/threads/${id}`), {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[ThreadDetailAPI] GET error for ${id}:`, error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const headers = await getBackendHeaders(request);
    
    const response = await fetch(resolveBackendUrl(`/threads/${id}`), {
      method: "PATCH",
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
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[ThreadDetailAPI] PATCH error for ${id}:`, error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const headers = await getBackendHeaders(request);
    
    const response = await fetch(resolveBackendUrl(`/threads/${id}`), {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText || "Backend error" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[ThreadDetailAPI] DELETE error for ${id}:`, error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
