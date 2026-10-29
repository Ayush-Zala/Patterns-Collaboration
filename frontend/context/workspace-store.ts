import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ScopeType = "company" | "organization" | "individual";
export type ActiveView = "settings" | "inbox" | "calendar" | "contacts" | "analytics" | "sequences";

interface WorkspaceState {
  scopeType: ScopeType;
  scopeId: string;
  activeView: ActiveView;
  setScope: (type: ScopeType, id: string) => void;
  setActiveView: (view: ActiveView) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      scopeType: "company",
      scopeId: "global",
      activeView: "settings",
      setScope: (type, id) => set({ scopeType: type, scopeId: id }),
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: "workspace-storage",
    }
  )
);
