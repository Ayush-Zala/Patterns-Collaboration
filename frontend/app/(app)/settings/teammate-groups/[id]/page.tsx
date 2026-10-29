"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { TeammateGroupForm } from "@/components/settings/teammate-group-form";
import { useWorkspaceStore } from "@/context/workspace-store";

export default function EditTeammateGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { scopeType } = useWorkspaceStore();

  const { id } = use(params);
  const [group, setGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (scopeType !== "organization" && scopeType !== "company") {
      router.push("/settings/home");
    }
  }, [scopeType, router]);

  if (scopeType !== "organization" && scopeType !== "company") return null;

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/settings/teammate-groups/${id}`);
        if (res.ok) {
          const data = await res.json();
          setGroup(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroup();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-muted-foreground">Loading group details...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-muted-foreground">Group not found.</div>
      </div>
    );
  }

  return <TeammateGroupForm initialData={group} groupId={id} isEdit />;
}
