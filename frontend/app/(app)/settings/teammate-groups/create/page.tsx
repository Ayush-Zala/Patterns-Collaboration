"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeammateGroupForm } from "@/components/settings/teammate-group-form";
import { useWorkspaceStore } from "@/context/workspace-store";

export default function CreateTeammateGroupPage() {
  const router = useRouter();
  const { scopeType } = useWorkspaceStore();

  useEffect(() => {
    if (scopeType !== "organization" && scopeType !== "company") {
      router.push("/settings/home");
    }
  }, [scopeType, router]);

  if (scopeType !== "organization" && scopeType !== "company") return null;

  return <TeammateGroupForm />;
}
