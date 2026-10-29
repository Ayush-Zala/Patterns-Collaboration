import { NextRequest } from "next/server";
import Papa from "papaparse";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export const runtime = "nodejs";

type InboxRow = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  created_at: string;
  custom_fields?: unknown;
};

type InboxesResponse = {
  inboxes?: InboxRow[];
  error?: string;
};

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(resolveBackendUrl("/inboxes"), {
      method: "GET",
      headers: await getBackendHeaders(request),
      cache: "no-store",
    });

    const payload = (await parseBackendJson(backendResponse)) as InboxesResponse;
    if (!backendResponse.ok) {
      return new Response(JSON.stringify({ error: payload.error || "Unable to export inboxes." }), {
        status: backendResponse.status,
        headers: { "content-type": "application/json" },
      });
    }

    const inboxes = payload.inboxes || [];
    const rows = inboxes.map((inbox) => ({
      id: inbox.id,
      name: inbox.name,
      description: inbox.description || "",
      custom_fields: JSON.stringify(inbox.custom_fields ?? {}),
    }));

    const csv = Papa.unparse(rows, {
      columns: ["id", "name", "description", "custom_fields"],
      header: true,
      skipEmptyLines: true,
    });

    const filename = `Inboxes Custom Fields ${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to export inboxes right now." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}
