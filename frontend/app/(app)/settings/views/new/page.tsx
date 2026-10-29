"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ViewForm } from "@/components/settings/view-form";
import { authClient } from "@/lib/auth-client";

export default function NewViewPage() {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();

  const handleCreate = async (data: any) => {
    if (!orgData?.id) throw new Error("No organization context");
    const res = await fetch("/api/settings/views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-org-id": orgData.id,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create view");
    }
    router.push("/settings/views");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-8 pb-4">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-6">
          <ScopeBreadcrumb />
          <span>›</span>
          <span>Resources</span>
          <span>›</span>
          <button onClick={() => router.push("/settings/views")} className="hover:text-foreground transition-colors">
            Views
          </button>
          <span>›</span>
          <span className="text-foreground">Create view</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="size-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create view</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set up a shared work queue for your team.
            </p>
          </div>
        </div>

        <ViewForm onSubmit={handleCreate} />
      </div>
    </div>
  );
}
