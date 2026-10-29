"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/context/workspace-store";
import { Building2, User } from "lucide-react";

function CompanyIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-3" />
      <path d="M9 9v.01" />
      <path d="M9 13v.01" />
      <path d="M9 17v.01" />
      <path d="M15 13v.01" />
      <path d="M15 17v.01" />
    </svg>
  );
}

export function ScopeBreadcrumb() {
  const router = useRouter();
  const { scopeType } = useWorkspaceStore();

  const handleBack = () => {
    // If we're coming from somewhere else in the app, this works well.
    // We could fallback to /settings if needed, but router.back() is what the user asked for.
    router.back();
  };

  return (
    <button 
      onClick={handleBack} 
      className="flex items-center gap-2 hover:text-foreground transition-colors"
    >
      {scopeType === "company" && (
        <>
          <CompanyIcon className="size-3" /> Company
        </>
      )}
      {scopeType === "organization" && (
        <>
          <Building2 className="size-3" /> Workspace
        </>
      )}
      {scopeType === "individual" && (
        <>
          <User className="size-3" /> Me
        </>
      )}
    </button>
  );
}
