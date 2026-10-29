"use client";

import Link from "next/link";
import { Briefcase, FileText, Mailbox, ShieldCheck, Signature, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const statuses = ["Available", "Busy", "Out of Office"] as const;

const cards = [
  {
    title: "Manage Inboxes",
    description: "Create a new inbox and start routing team conversations.",
    href: "/settings/inboxes/create",
    buttonLabel: "Create Inbox",
    icon: Mailbox,
  },
  {
    title: "Manage Templates",
    description: "Create a reusable message template for faster replies.",
    href: "/settings/message-templates/create",
    buttonLabel: "Create Template",
    icon: FileText,
  },
  {
    title: "Manage Time Off",
    description: "Create a time-off entry and define away windows.",
    href: "/settings/time-off/create",
    buttonLabel: "Create Time Off",
    icon: Briefcase,
  },
  {
    title: "Manage Signatures",
    description: "Create a signature and assign channel access.",
    href: "/settings/signatures/create",
    buttonLabel: "Create Signature",
    icon: Signature,
  },
];

export function SettingsHome() {
  const { data: session } = authClient.useSession();
  
  const name = session?.user?.name || "Loading...";
  const email = session?.user?.email || "Loading...";
  const username = name !== "Loading..." ? `@${name.toLowerCase().replace(/\s+/g, '_')}` : "@loading...";

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">General</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Home</h1>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[380px_1fr] mt-4">
        {/* PROFILE CARD */}
        <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl h-fit">
          <div className="mb-6 pb-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Profile Summary</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Quick identity and availability status.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{username}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border space-y-2 mt-3">
                <p className="text-sm text-muted-foreground">{email}</p>
                <p className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
                  <ShieldCheck className="size-3.5" />
                  Two-factor authentication enabled
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="space-y-3">
                {statuses.map((status, index) => (
                  <label key={status} className="flex items-center justify-between text-sm cursor-pointer group">
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{status}</span>
                    <input 
                      type="radio" 
                      name="home-status" 
                      defaultChecked={index === 0} 
                      className="size-4 accent-primary bg-muted border-border cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0">
          <div className="mb-6 pb-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Quick Actions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Jump straight to important configuration modules.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {cards.map((card) => (
              <div
                key={card.title}
                className="group flex flex-col justify-between rounded-xl border border-border bg-muted/30 p-5 hover:bg-primary/[0.03] hover:border-primary/30 transition-all h-[180px]"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border group-hover:border-primary/20">
                      <card.icon className="size-4" />
                    </div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">{card.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{card.description}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                  <Button asChild size="sm" variant="outline" className="h-8 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Link href={card.href}>{card.buttonLabel}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
