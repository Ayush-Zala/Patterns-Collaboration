import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthUserMenu } from "@/components/auth-user-menu";
import { WorkspaceViewSwitcher } from "@/components/workspace-view-switcher";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { ensureOrgMembership } from "@/lib/ensure-org-membership";

import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  if (!session) {
    redirect("/sign-in");
  }
  await ensureOrgMembership(session, requestHeaders).catch(() => null);

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-md px-4 sm:px-6 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1">
              <SidebarTrigger className="text-zinc-400 hover:text-foreground transition-colors" />
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <AuthUserMenu />
          </div>
        </header>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          {children}
        </section>
      </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

