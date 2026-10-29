"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadResult = {
  updated?: number;
  error?: string;
};

type DownloadInfo = {
  filename: string;
  sizeBytes: number;
} | null;

function formatBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / Math.pow(1024, index);
  const formatted = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted}${units[index]}`;
}

export function SettingsInboxesBulkEditCustomFields() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo>(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const templateFilename = useMemo(() => downloadInfo?.filename || "Inboxes Custom Fields.csv", [downloadInfo]);

  const downloadTemplate = useCallback(async () => {
    setDownloadError(null);
    setIsDownloading(true);

    try {
      const response = await fetch("/api/settings/inboxes/custom-fields/export", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to download export right now.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const filename = decodeURIComponent((match?.[1] || match?.[2] || "Inboxes Custom Fields.csv").trim());

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setDownloadInfo({ filename, sizeBytes: blob.size });
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Unable to download export right now.");
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const uploadCsv = useCallback(async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/settings/inboxes/custom-fields/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as UploadResult | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to import CSV right now.");
      }

      const updated = payload?.updated ?? 0;
      setUploadSuccess(`Uploaded. Updated ${updated} inbox${updated === 1 ? "" : "es"}.`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to import CSV right now.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bulk edit custom fields</h1>
        </div>
        <Button
          asChild
          variant="outline"
          className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          <Link href="/settings/inboxes">Back to inboxes</Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4 max-w-3xl">
        <div className="space-y-10">
          {/* Step 1 */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Prepare custom field edits</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Download current custom field data and make edits with your favorite file editor.
                </p>
              </div>
            </div>

            <div className="pl-9">
              <Button
                type="button"
                variant="outline"
                onClick={() => void downloadTemplate()}
                disabled={isDownloading}
                className="h-auto justify-start gap-3 rounded-xl border-border bg-muted/30 px-4 py-3 text-left text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <div className="flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileSpreadsheet className="size-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold">
                    {isDownloading ? "Preparing download..." : templateFilename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {downloadInfo ? formatBytes(downloadInfo.sizeBytes) : "CSV export"}
                  </span>
                </div>
              </Button>
              {downloadError && <p className="mt-3 text-xs text-red-400 font-medium">{downloadError}</p>}
            </div>
          </section>

          {/* Step 2 */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Upload modified CSV file</h2>
              </div>
            </div>

            <div className="pl-9">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadCsv(file);
                  event.target.value = "";
                }}
              />

              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "copy";
                  }
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(false);

                  const file = event.dataTransfer.files?.[0];
                  if (!file) return;
                  void uploadCsv(file);
                }}
                className={cn(
                  "rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
                  "border-border bg-card/10",
                  isDragActive && "border-primary/40 bg-primary/[0.06]",
                  isUploading && "opacity-80"
                )}
              >
                <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-card/60 border border-border">
                  <UploadCloud className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Drag and drop your CSV or{" "}
                  <button
                    type="button"
                    className="text-primary font-semibold hover:text-foreground transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Choose file
                  </button>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Supported format: .CSV</p>
              </div>

              {isUploading && <p className="mt-3 text-xs text-muted-foreground font-medium">Uploading...</p>}
              {uploadError && <p className="mt-3 text-xs text-red-400 font-medium">{uploadError}</p>}
              {uploadSuccess && <p className="mt-3 text-xs text-emerald-500 font-medium">{uploadSuccess}</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
