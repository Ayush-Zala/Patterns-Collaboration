"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type AuthUserMenuProps = {
  className?: string;
};

export function AuthUserMenu({ className }: AuthUserMenuProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function onSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const role = (session?.user as { role?: string } | undefined)?.role || "admin";
  const name = session?.user?.name || "Team Member";
  const email = session?.user?.email || "Unknown user";

  // Get initials for avatar fallback
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || email.substring(0, 2).toUpperCase();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = mounted ? name : "Team Member";
  const displayEmail = mounted ? email : "";
  const displayRole = mounted ? role.replace("_", " ") : "Loading...";

  return (
    <div className={cn("flex items-center gap-4 bg-card/40 border border-border rounded-full py-1.5 pl-2 pr-2 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-inner">
          {mounted ? initials : "..."}
        </div>
        <div className="min-w-0 pr-2">
          <p className="max-w-48 truncate text-sm font-semibold text-foreground leading-tight">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">{displayRole}</p>
            {displayEmail && (
              <>
                <span className="text-zinc-700 text-[10px]">•</span>
                <p className="truncate text-[10px] text-muted-foreground">{displayEmail}</p>
              </>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void onSignOut()}
        disabled={!mounted || isPending}
        className="size-8 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Sign Out"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
