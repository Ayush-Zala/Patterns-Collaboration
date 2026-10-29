"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PreferenceSection } from "@/components/settings/preference-section";
import { PreferenceItem } from "@/components/settings/preference-item";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { usePreferences } from "@/context/preferences-context";

export function SettingsPreferences() {
  const { prefs, loading, updatePref } = usePreferences();
  const [search, setSearch] = useState("");
  const [inboxes, setInboxes] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/settings/inboxes")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch inboxes");
        return res.json();
      })
      .then(data => {
        if (data.inboxes) setInboxes(data.inboxes);
      })
      .catch(err => console.error(err));
  }, []);
  const { theme, setTheme } = useTheme();

  // Render without blocking on loading to prevent stuck UI

  const sections = [
    {
      title: "Theme",
      description: "Choose the appearance of Patterns. Selecting \"System\" will have the app sync with your computer OS-level appearance settings for light and dark mode.",
      key: "theme",
      content: (
        <Select value={theme} onValueChange={(v) => { setTheme(v); updatePref("theme", v); }}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Conversation list density",
      description: "Choose the conversation cell style for your conversation list",
      key: "density",
      content: (
        <Select value={prefs.density || "default"} onValueChange={(v) => updatePref("density", v)}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select density" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="comfortable">Comfortable</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Set time zone automatically",
      description: "We will use your system time zone.",
      key: "autoTimezone",
      content: (
        <Switch 
          checked={prefs.autoTimezone ?? true} 
          onCheckedChange={(v) => updatePref("autoTimezone", v)} 
        />
      )
    },
    {
      title: "Send button",
      description: "Choose the default send button for all composers. For conversations with ticket statuses, the button will be labeled accordingly (e.g. 'Send & Archive' will be 'Send as Resolved')",
      key: "sendButtonBehavior",
      content: (
        <Select value={prefs.sendButtonBehavior || "sendAndArchive"} onValueChange={(v) => updatePref("sendButtonBehavior", v)}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select behavior" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="sendOnly">Send Only</SelectItem>
            <SelectItem value="sendAndArchive">Send & Archive</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Subscribe on comment",
      description: "Automatically subscribe to conversations after posting a comment",
      key: "subscribeOnComment",
      content: (
        <Switch 
          checked={prefs.subscribeOnComment ?? true} 
          onCheckedChange={(v) => updatePref("subscribeOnComment", v)} 
        />
      )
    },
    {
      title: "Subscribe on reply",
      description: "Automatically subscribe to conversations after sending a reply",
      key: "subscribeOnReply",
      content: (
        <Switch 
          checked={prefs.subscribeOnReply ?? true} 
          onCheckedChange={(v) => updatePref("subscribeOnReply", v)} 
        />
      )
    },
    {
      title: "Unsubscribe on unassign",
      description: "Automatically unsubscribe from conversations you unassign or assign to a teammate",
      key: "unsubscribeOnUnassign",
      content: (
        <Switch 
          checked={prefs.unsubscribeOnUnassign ?? false} 
          onCheckedChange={(v) => updatePref("unsubscribeOnUnassign", v)} 
        />
      )
    },
    {
      title: "\"Enter\" to send in chat",
      description: "Press Enter to send when writing chat, Facebook, Twitter, Intercom, and other messaging channels",
      key: "enterToSend",
      content: (
        <Switch 
          checked={prefs.enterToSend ?? false} 
          onCheckedChange={(v) => updatePref("enterToSend", v)} 
        />
      )
    },
    {
      title: "Paste as text",
      description: "Strip the formatting when pasting text in a composer",
      key: "pasteAsText",
      content: (
        <Switch 
          checked={prefs.pasteAsText ?? false} 
          onCheckedChange={(v) => updatePref("pasteAsText", v)} 
        />
      )
    },
    {
      title: "No attachments warning",
      description: "Display a warning when we think a draft may be missing attachments",
      key: "attachmentWarning",
      content: (
        <Switch 
          checked={prefs.attachmentWarning ?? true} 
          onCheckedChange={(v) => updatePref("attachmentWarning", v)} 
        />
      )
    },
    {
      title: "Sort workspace lists alphabetically",
      description: "Display tags and shared inboxes in alphabetical order in your workspace",
      key: "alphabeticalSort",
      content: (
        <Switch 
          checked={prefs.alphabeticalSort ?? true} 
          onCheckedChange={(v) => updatePref("alphabeticalSort", v)} 
        />
      )
    },
    {
      title: "Long time format",
      description: "Click on any timestamp to toggle between long/short formats",
      key: "timeFormat",
      content: (
        <Select value={prefs.timeFormat || "12h"} onValueChange={(v) => updatePref("timeFormat", v)}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="12h">12-hour clock</SelectItem>
            <SelectItem value="24h">24-hour clock</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Mark as read",
      description: "Choose when messages are automatically marked as read",
      key: "markAsRead",
      content: (
        <Select value={prefs.markAsRead || "onOpen"} onValueChange={(v) => updatePref("markAsRead", v)}>
          <SelectTrigger className="w-[220px] bg-background border-border">
            <SelectValue placeholder="Select behavior" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="immediately">Immediately</SelectItem>
            <SelectItem value="onOpen">When message is opened</SelectItem>
            <SelectItem value="after5s">After 5 seconds</SelectItem>
            <SelectItem value="never">Never</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Week start",
      description: "Show the first day of the week as:",
      key: "weekStart",
      content: (
        <Select value={prefs.weekStart || "sunday"} onValueChange={(v) => updatePref("weekStart", v)}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="sunday">Sunday</SelectItem>
            <SelectItem value="monday">Monday</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Allow access to my individual resources via the API",
      description: "Allow your channels, contacts, conversations, inboxes, messages, rules and tags to be accessible via the API.",
      key: "apiAccess",
      content: (
        <Switch 
          checked={prefs.apiAccess ?? false} 
          onCheckedChange={(v) => updatePref("apiAccess", v)} 
        />
      )
    },
    {
      title: "Badge counter",
      description: "Manage the counter reflected in your badge",
      key: "badgeCounter",
      content: (
        <Select value={prefs.badgeCounter || "myInbox"} onValueChange={(v) => updatePref("badgeCounter", v)}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="myInbox">My inbox</SelectItem>
            <SelectItem value="allInboxes">All inboxes</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Default phone number prefix",
      description: "Used when inputting phone numbers without prefixes in the composer and contact manager",
      key: "phonePrefix",
      content: (
        <Input 
          value={prefs.phonePrefix || "+1"} 
          onChange={(e) => updatePref("phonePrefix", e.target.value)}
          className="w-[80px] bg-background border-border text-center"
        />
      )
    },
    {
      title: "Shared inbox tabs",
      description: "Choose between 'Unassigned' and 'Assigned' or a combined 'Open' tab",
      key: "sharedInboxTabs",
      content: (
        <Select value={prefs.sharedInboxTabs || "unassignedAssigned"} onValueChange={(v) => updatePref("sharedInboxTabs", v)}>
          <SelectTrigger className="w-[200px] bg-background border-border">
            <SelectValue placeholder="Select tabs" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="unassignedAssigned">Unassigned / Assigned</SelectItem>
            <SelectItem value="combinedOpen">Combined "Open"</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Inbox counters",
      description: "Set the value of the counters for your individual inboxes",
      key: "inboxCounters",
      content: (
        <Select value={prefs.inboxCounters || "open"} onValueChange={(v) => updatePref("inboxCounters", v)}>
          <SelectTrigger className="w-[180px] bg-background border-border">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="open">Open conversations</SelectItem>
            <SelectItem value="unread">Unread only</SelectItem>
            <SelectItem value="all">All conversations</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      title: "Hidden Inboxes",
      description: "Manage inboxes that are hidden from your sidebar",
      key: "hiddenInboxes",
      content: (
        <div className="flex flex-col gap-2 min-w-[200px]">
          {(prefs.hiddenInboxes || []).length === 0 ? (
            <span className="text-sm text-muted-foreground italic">No hidden inboxes</span>
          ) : (
            (prefs.hiddenInboxes || []).map((id: string) => {
              const inbox = inboxes.find(i => i.id === id);
              return (
                <div key={id} className="flex items-center justify-between gap-4 p-2 rounded border border-border bg-background">
                  <span className="text-sm font-medium">{inbox ? inbox.name : id}</span>
                  <button
                    onClick={() => {
                      const newHidden = (prefs.hiddenInboxes || []).filter((h: string) => h !== id);
                      updatePref("hiddenInboxes", newHidden);
                    }}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Unhide
                  </button>
                </div>
              );
            })
          )}
        </div>
      )
    }
  ];

  const filteredItems = sections.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">ME</div>
             <h2 className="text-2xl font-bold text-foreground tracking-tight">Preferences</h2>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
          <Input 
            placeholder="Search preferences..." 
            className="pl-10 h-11 bg-background/50 border-border focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-12">
        {/* General Section */}
        <PreferenceSection title="General">
          {filteredItems.filter(i => ["theme", "density", "autoTimezone", "timeFormat", "markAsRead", "weekStart"].includes(i.key)).map(item => (
            <PreferenceItem key={item.key} title={item.title} description={item.description}>
              {item.content}
            </PreferenceItem>
          ))}
        </PreferenceSection>

        {/* Workflow Section */}
        <PreferenceSection title="Workflow">
          {filteredItems.filter(i => ["sendButtonBehavior", "subscribeOnComment", "subscribeOnReply", "unsubscribeOnUnassign", "apiAccess", "sharedInboxTabs"].includes(i.key)).map(item => (
            <PreferenceItem key={item.key} title={item.title} description={item.description}>
              {item.content}
            </PreferenceItem>
          ))}
        </PreferenceSection>

        {/* Composer Section */}
        <PreferenceSection title="Composer">
          {filteredItems.filter(i => ["enterToSend", "pasteAsText", "attachmentWarning", "phonePrefix"].includes(i.key)).map(item => (
            <PreferenceItem key={item.key} title={item.title} description={item.description}>
              {item.content}
            </PreferenceItem>
          ))}
        </PreferenceSection>

        {/* Sidebar Section */}
        <PreferenceSection title="Sidebar">
          {filteredItems.filter(i => ["alphabeticalSort", "badgeCounter", "inboxCounters", "hiddenInboxes"].includes(i.key)).map(item => (
            <PreferenceItem key={item.key} title={item.title} description={item.description}>
              {item.content}
            </PreferenceItem>
          ))}
        </PreferenceSection>

        {/* Safety & Security Section */}
        <PreferenceSection title="Safety & Security">
          <PreferenceItem 
            title="Other sessions" 
            description="Use this to ensure that this account is no longer accessible from any other device"
          >
            <button 
              onClick={() => {
                // Implement sign out others logic
                void fetch("/api/settings/sessions/sign-out-others", { method: "POST" });
              }}
              className="px-4 py-2 bg-background hover:bg-muted border border-border rounded-lg text-sm font-medium transition-colors"
            >
              Sign out other sessions
            </button>
          </PreferenceItem>
          <PreferenceItem 
            title="Offline cache" 
            description="Reclaim disk space by deleting recent conversations from the app cache"
          >
            <button 
              onClick={() => {
                // Clear cache logic
                if (typeof window !== "undefined") {
                  window.localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-background hover:bg-muted border border-border rounded-lg text-sm font-medium transition-colors"
            >
              Clear offline cache
            </button>
          </PreferenceItem>
        </PreferenceSection>

        {filteredItems.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-background border border-border">
              <Search className="size-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No preferences found matching "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
