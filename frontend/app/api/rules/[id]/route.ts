import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl, getBackendHeaders } from "@/lib/backend-proxy";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await fetch(resolveBackendUrl(`/rules/${id}`), {
      method: "DELETE",
      headers: await getBackendHeaders(request),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[RulesProxy] DELETE backend error:", data);
      return NextResponse.json(data || { error: "Failed to delete rule" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[RulesProxy] DELETE exception:", err.message);
    return NextResponse.json({ error: "Internal server error", message: err.message }, { status: 500 });
  }
}
