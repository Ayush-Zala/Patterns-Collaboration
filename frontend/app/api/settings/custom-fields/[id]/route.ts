import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/custom-fields/${id}`), {
      method: "DELETE",
      headers,
      cache: "no-store",
    });

    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error(`[API] Error deleting custom field:`, error);
    return NextResponse.json({ error: "Unable to delete custom field." }, { status: 503 });
  }
}
