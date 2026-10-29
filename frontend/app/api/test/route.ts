import { NextResponse } from "next/server";
import { resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET() {
  const url = resolveBackendUrl("/channels");
  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json({ url, success: true, data });
  } catch (error: any) {
    return NextResponse.json({ url, success: false, error: error.message, cause: error.cause?.message || String(error.cause) });
  }
}
