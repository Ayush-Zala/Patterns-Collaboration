import Papa from "papaparse";

export type ParsedTable = {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
};

export type ParseResult =
  | { data: ParsedTable; warnings: string[] }
  | { error: string };

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

function buildRowsFromObjects(items: Array<Record<string, unknown>>): ParsedTable {
  const columns = Array.from(
    items.reduce((keys, item) => {
      Object.keys(item || {}).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>())
  );

  const rows = items.map((item) => {
    const row: Record<string, string> = {};
    columns.forEach((column) => {
      row[column] = normalizeValue(item?.[column]);
    });
    return row;
  });

  return { columns, rows, totalRows: rows.length };
}

function buildRowsFromArrays(items: Array<Array<unknown>>): ParsedTable {
  const maxLength = items.reduce((max, row) => Math.max(max, row.length), 0);
  const columns = Array.from({ length: maxLength }, (_, index) => `Column ${index + 1}`);
  const rows = items.map((row) => {
    const record: Record<string, string> = {};
    columns.forEach((column, index) => {
      record[column] = normalizeValue(row[index]);
    });
    return record;
  });

  return { columns, rows, totalRows: rows.length };
}

async function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = (results.data as Array<Record<string, unknown>>).filter(
          (row) => row && Object.keys(row).length > 0
        );
        const hasHeaders = Array.isArray(results.meta.fields) && results.meta.fields.length > 0;

        if (data.length === 0 && !hasHeaders) {
          Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (fallback) => {
              const rows = fallback.data as Array<Array<unknown>>;
              if (!rows.length) {
                resolve({ error: "No rows found in the CSV." });
                return;
              }
              resolve({ data: buildRowsFromArrays(rows), warnings: [] });
            },
            error: () => resolve({ error: "Unable to parse the CSV file." }),
          });
          return;
        }

        if (!data.length) {
          resolve({ error: "No rows found in the CSV." });
          return;
        }

        resolve({ data: buildRowsFromObjects(data), warnings: [] });
      },
      error: () => resolve({ error: "Unable to parse the CSV file." }),
    });
  });
}

async function parseJson(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return { error: "JSON array is empty." };
      if (parsed.every((item) => Array.isArray(item))) {
        return { data: buildRowsFromArrays(parsed as Array<Array<unknown>>), warnings: [] };
      }
      if (parsed.every((item) => typeof item === "object" && item !== null)) {
        return { data: buildRowsFromObjects(parsed as Array<Record<string, unknown>>), warnings: [] };
      }
      return {
        data: buildRowsFromObjects([{ value: parsed.map((item) => normalizeValue(item)).join(", ") }]),
        warnings: ["JSON array contains mixed values. Flattened into a single column."],
      };
    }

    if (typeof parsed === "object" && parsed !== null) {
      const maybeData = (parsed as { data?: unknown }).data;
      if (Array.isArray(maybeData)) {
        if (maybeData.length === 0) return { error: "JSON data array is empty." };
        if (maybeData.every((item) => typeof item === "object" && item !== null)) {
          return { data: buildRowsFromObjects(maybeData as Array<Record<string, unknown>>), warnings: [] };
        }
      }
      return { data: buildRowsFromObjects([parsed as Record<string, unknown>]), warnings: [] };
    }

    return { data: buildRowsFromObjects([{ value: normalizeValue(parsed) }]), warnings: [] };
  } catch {
    return { error: "Unable to parse the JSON file." };
  }
}

export async function parseTabularFile(file: File): Promise<ParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type.toLowerCase();

  if (extension === "csv" || mimeType.includes("csv") || extension === "tsv") {
    return parseCsv(file);
  }

  if (extension === "json" || mimeType.includes("json")) {
    return parseJson(file);
  }

  return { error: "Unsupported file type. Upload a CSV or JSON document." };
}

export function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / Math.pow(1024, index);
  const formatted = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[index]}`;
}
