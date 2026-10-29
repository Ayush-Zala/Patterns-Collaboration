"use client";

import { useEffect } from "react";

import { useWorkspaceStore } from "@/context/workspace-store";
import { User, Building2, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function ScopeSwitcher() {
  const { scopeType, setScope, activeView } = useWorkspaceStore();
  const { data: session } = authClient.useSession();
  const { data: orgData } = authClient.useActiveOrganization();
  const router = useRouter();

  // Determine fallback IDs if specific scopes are selected
  const userId = session?.user?.id || "u-sales-1";
  const orgId = orgData?.id || "org_123";

  const memberRole = orgData?.role || session?.user?.role;
  const isAdmin = memberRole === "admin" || memberRole === "owner";

  // If they are not an admin but their scope is set to company or organization, force it back to individual.
  useEffect(() => {
    if (session && !isAdmin && scopeType !== "individual") {
      setScope("individual", userId);
    }
  }, [isAdmin, scopeType, setScope, userId, session]);

  const handleScopeChange = (type: any, id: string, defaultPath: string) => {
    setScope(type, id);
    if (activeView === "settings") {
      router.push(defaultPath);
    }
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
      <button
        onClick={() => handleScopeChange("individual", userId, "/settings/home")}
        className={cn(
          "flex-1 flex items-center justify-center p-1.5 rounded-md transition-all",
          scopeType === "individual"
            ? "bg-muted text-primary shadow-sm border border-border"
            : "text-muted-foreground hover:text-muted-foreground hover:bg-muted/50"
        )}
        title="Individual"
      >
        <User className="size-4" />
      </button>

      {isAdmin && (
        <>
          <button
            onClick={() => handleScopeChange("company", "global", "/settings/home")}
            className={cn(
              "flex-1 flex items-center justify-center p-1.5 rounded-md transition-all",
              scopeType === "company"
                ? "bg-muted text-primary shadow-sm border border-border"
                : "text-muted-foreground hover:text-muted-foreground hover:bg-muted/50"
            )}
            title="Company"
          >
            <Building2 className="size-4" />
          </button>

          <button
            onClick={() => handleScopeChange("organization", orgId, "/settings/teammates")}
            className={cn(
              "flex-1 flex items-center justify-center p-1.5 rounded-md transition-all",
              scopeType === "organization"
                ? "bg-muted text-primary shadow-sm border border-border"
                : "text-muted-foreground hover:text-muted-foreground hover:bg-muted/50"
            )}
            title="Organisation"
          >
            <BarChart2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
