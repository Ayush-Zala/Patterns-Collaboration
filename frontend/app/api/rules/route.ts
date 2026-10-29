import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl, getBackendHeaders } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(resolveBackendUrl("/rules"), {
      headers: await getBackendHeaders(request),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[RulesProxy] GET backend error:", data);
      return NextResponse.json(data || { error: "Failed to fetch rules" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[RulesProxy] GET exception:", err.message);
    return NextResponse.json({ error: "Internal server error", message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(resolveBackendUrl("/rules"), {
      method: "POST",
      headers: {
        ...(await getBackendHeaders(request)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[RulesProxy] POST backend error:", data);
      return NextResponse.json(data || { error: "Failed to create rule" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[RulesProxy] POST exception:", err.message);
    return NextResponse.json({ error: "Internal server error", message: err.message }, { status: 500 });
  }
}
