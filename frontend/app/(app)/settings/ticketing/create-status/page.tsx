"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { TicketStatusForm } from "@/components/settings/ticket-status-form";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CreateStatusPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-8 pb-4">
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
          <ScopeBreadcrumb /> <span>›</span> 
          <Link href="/settings/ticketing" className="hover:text-muted-foreground">Ticket statuses</Link> <span>›</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-8">Create status</h1>
        <TicketStatusForm />
      </div>
    </div>
  );
}

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
