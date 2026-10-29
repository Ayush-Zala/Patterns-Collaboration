import { NextRequest } from "next/server";
import Papa from "papaparse";

export const runtime = "nodejs";

type RowRecord = Record<string, unknown>;

type ParsedData = {
  rows: RowRecord[];
  columns: string[];
};

const DATE_KEYS = [
  "date",
  "created_at",
  "createdAt",
  "timestamp",
  "time",
  "logged_at",
  "event_time",
];

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildColumns(rows: RowRecord[]): string[] {
  return Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row || {}).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>())
  );
}

function normalizeRows(rows: RowRecord[], columns: string[]): RowRecord[] {
  return rows.map((row) => {
    const normalized: RowRecord = {};
    columns.forEach((column) => {
      normalized[column] = normalizeValue(row?.[column]);
    });
    return normalized;
  });
}

function buildRowsFromArrays(rows: Array<Array<unknown>>): ParsedData {
  const maxLength = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columns = Array.from({ length: maxLength }, (_, index) => `Column ${index + 1}`);
  const mapped = rows.map((row) => {
    const record: RowRecord = {};
    columns.forEach((column, index) => {
      record[column] = normalizeValue(row[index]);
    });
    return record;
  });
  return { rows: mapped, columns };
}

function parseCsvText(text: string): ParsedData {
  const parsed = Papa.parse<RowRecord>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data || [];
  if (rows.length && parsed.meta.fields && parsed.meta.fields.length) {
    const columns = parsed.meta.fields;
    return { rows: normalizeRows(rows, columns), columns };
  }

  const fallback = Papa.parse<Array<unknown>>(text, {
    header: false,
    skipEmptyLines: true,
  });

  return buildRowsFromArrays(fallback.data || []);
}

function parseJsonText(text: string): ParsedData {
  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { rows: [], columns: [] };
    if (parsed.every((item) => Array.isArray(item))) {
      return buildRowsFromArrays(parsed as Array<Array<unknown>>);
    }
    if (parsed.every((item) => typeof item === "object" && item !== null)) {
      const rows = parsed as RowRecord[];
      const columns = buildColumns(rows);
      return { rows: normalizeRows(rows, columns), columns };
    }

    return {
      rows: [{ value: parsed.map((item) => normalizeValue(item)).join(", ") }],
      columns: ["value"],
    };
  }

  if (typeof parsed === "object" && parsed !== null) {
    const rows = [parsed as RowRecord];
    const columns = buildColumns(rows);
    return { rows: normalizeRows(rows, columns), columns };
  }

  return { rows: [{ value: normalizeValue(parsed) }], columns: ["value"] };
}

function pickDateColumn(rows: RowRecord[]): string | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);

  for (const key of DATE_KEYS) {
    if (keys.includes(key)) return key;
  }

  for (const key of keys) {
    const value = rows[0]?.[key];
    if (!value) continue;
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return key;
  }

  return null;
}

function filterByDate(rows: RowRecord[], date: string): RowRecord[] {
  const dateColumn = pickDateColumn(rows);
  if (!dateColumn) return rows;

  return rows.filter((row) => {
    const raw = row[dateColumn];
    if (!raw) return false;
    const parsed = new Date(String(raw));
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.toISOString().slice(0, 10) === date;
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const date = String(formData.get("date") || "").trim();

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "file is required." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const text = await file.text();
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.type.toLowerCase();

    let parsed: ParsedData;
    if (extension === "json" || mimeType.includes("json")) {
      parsed = parseJsonText(text);
    } else {
      parsed = parseCsvText(text);
    }

    if (!parsed.rows.length) {
      return new Response(JSON.stringify({ error: "No rows found in the file." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const filteredRows = date ? filterByDate(parsed.rows, date) : parsed.rows;
    if (date && filteredRows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows matched the selected date." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const columns = parsed.columns.length ? parsed.columns : buildColumns(filteredRows);
    const normalized = normalizeRows(filteredRows, columns);
    const csv = Papa.unparse(normalized, { columns, header: true, skipEmptyLines: true });

    const filenameSuffix = date || new Date().toISOString().slice(0, 10);
    const filename = `Activity Export ${filenameSuffix}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unable to generate export right now." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}
