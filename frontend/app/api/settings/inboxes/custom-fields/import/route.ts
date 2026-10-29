import { NextRequest } from "next/server";
import Papa from "papaparse";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export const runtime = "nodejs";

type ImportRow = {
  id?: string;
  inbox_id?: string;
  custom_fields?: string;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "file is required." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const text = await file.text();
    const parsed = Papa.parse<ImportRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      return new Response(JSON.stringify({ error: "CSV could not be parsed. Check the file format." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const rows = parsed.data || [];
    const updates = rows
      .map((row) => {
        const inboxId = String(row.id || row.inbox_id || "").trim();
        const customFieldsRaw = String(row.custom_fields ?? "").trim();

        if (!inboxId) return null;

        let customFields: unknown = {};
        if (customFieldsRaw) {
          try {
            customFields = JSON.parse(customFieldsRaw);
          } catch {
            return { inbox_id: inboxId, error: "custom_fields must be valid JSON." } as const;
          }
        }

        return { inbox_id: inboxId, custom_fields: customFields };
      })
      .filter(Boolean);

    const invalid = updates.find((update) => "error" in (update as any));
    if (invalid && (invalid as any).error) {
      return new Response(
        JSON.stringify({ error: `Row for inbox_id ${String((invalid as any).inbox_id)}: ${(invalid as any).error}` }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const sanitizedUpdates = (updates as Array<{ inbox_id: string; custom_fields: unknown }>).filter(
      (update) => update.inbox_id
    );

    if (!sanitizedUpdates.length) {
      return new Response(JSON.stringify({ error: "No updates found in CSV." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const backendResponse = await fetch(resolveBackendUrl("/inboxes/custom-fields/bulk"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({ updates: sanitizedUpdates }),
      cache: "no-store",
    });

    const payload = (await parseBackendJson(backendResponse)) as { updated?: number; error?: string };
    return new Response(JSON.stringify(payload), {
      status: backendResponse.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to import custom fields right now." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}
