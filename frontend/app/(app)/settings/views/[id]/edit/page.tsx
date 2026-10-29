"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ViewForm } from "@/components/settings/view-form";
import { authClient } from "@/lib/auth-client";

export default function EditViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  const [view, setView] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!orgData?.id) return;
      try {
        const res = await fetch(`/api/settings/views/${id}`, {
          headers: { "x-org-id": orgData.id },
        });
        if (res.ok) setView(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, orgData?.id]);

  const handleSave = async (data: any) => {
    if (!orgData?.id) throw new Error("No organization context");
    const res = await fetch(`/api/settings/views/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-org-id": orgData.id },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update view");
    }
    router.push("/settings/views");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!orgData?.id) return;
    await fetch(`/api/settings/views/${id}`, {
      method: "DELETE",
      headers: { "x-org-id": orgData.id },
    });
    router.push("/settings/views");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        View not found.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-8 pb-4">
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-6">
          <ScopeBreadcrumb />
          <span>›</span>
          <span>Resources</span>
          <span>›</span>
          <button onClick={() => router.push("/settings/views")} className="hover:text-foreground transition-colors">
            Views
          </button>
          <span>›</span>
          <span className="text-foreground">{view.name}</span>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="size-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit view</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Update this shared view for your team.</p>
          </div>
        </div>

        <ViewForm
          initialData={view}
          onSubmit={handleSave}
          onDelete={handleDelete}
          isEdit
        />
      </div>
    </div>
  );
}
