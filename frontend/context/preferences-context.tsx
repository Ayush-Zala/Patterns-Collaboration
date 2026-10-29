"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Preferences {
  theme?: string;
  density?: "default" | "compact" | "comfortable";
  autoTimezone?: boolean;
  sendButtonBehavior?: "sendOnly" | "sendAndArchive";
  subscribeOnComment?: boolean;
  subscribeOnReply?: boolean;
  unsubscribeOnUnassign?: boolean;
  enterToSend?: boolean;
  pasteAsText?: boolean;
  attachmentWarning?: boolean;
  alphabeticalSort?: boolean;
  markAsRead?: "immediately" | "onOpen" | "after5s" | "never";
  defaultCalendar?: string;
  defaultVideoConf?: string;
  weekStart?: "sunday" | "monday";
  apiAccess?: boolean;
  badgeCounter?: "myInbox" | "allInboxes" | "none";
  phonePrefix?: string;
  sharedInboxTabs?: "unassignedAssigned" | "combinedOpen";
  frontLinksTarget?: "browser" | "desktop";
  inboxCounters?: "open" | "all";
  delegatedInboxes?: string[];
  [key: string]: any;
}

interface PreferencesContextType {
  prefs: Preferences;
  loading: boolean;
  updatePref: (key: string, value: any) => Promise<void>;
  refresh: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>({
    density: "default",
    autoTimezone: true,
    sendButtonBehavior: "sendOnly",
    subscribeOnComment: true,
    subscribeOnReply: true,
    alphabeticalSort: true,
    timeFormat: "12h",
    markAsRead: "onOpen",
    weekStart: "sunday",
    apiAccess: false,
    badgeCounter: "myInbox",
    phonePrefix: "+1",
    sharedInboxTabs: "unassignedAssigned",
    frontLinksTarget: "browser",
    inboxCounters: "open",
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/settings/user-settings/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to load preferences", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const updatePref = async (key: string, value: any) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await fetch("/api/settings/user-settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      console.error("Failed to update preference", err);
    }
  };

  return (
    <PreferencesContext.Provider value={{ prefs, loading, updatePref, refresh }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
