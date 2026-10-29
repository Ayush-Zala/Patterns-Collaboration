"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const [settings, setSettings] = useState({
    desktop: "smart",
    mobile: "smart",
    email: "smart"
  });
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resSettings, resRules] = await Promise.all([
          fetch("/api/settings/user-settings/notifications"),
          fetch("/api/settings/user-settings/notification-rules")
        ]);
        
        if (resSettings.ok) {
          const data = await resSettings.json();
          setSettings(data);
        }
        if (resRules.ok) {
          const data = await resRules.json();
          setRules(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  async function updateSetting(type: "desktop" | "mobile" | "email", value: string) {
    const newSettings = { ...settings, [type]: value };
    setSettings(newSettings);
    
    try {
      await fetch("/api/settings/user-settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const res = await fetch(`/api/settings/user-settings/notification-rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules(prev => prev.filter((r: any) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleEnableBrowserNotifications() {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      alert("Browser notifications are already enabled.");
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("Notifications Enabled", {
            body: "You will now receive notifications here.",
          });
        }
      });
    } else {
      alert("You have blocked notifications. Please enable them in your browser settings.");
    }
  }

  const RadioOption = ({ label, type, value }: { label: string, type: "desktop" | "mobile" | "email", value: string }) => {
    const isChecked = settings[type] === value;
    return (
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative flex items-center justify-center size-4 rounded-full border border-border bg-card group-hover:border-indigo-500 transition-colors">
          {isChecked && <div className="size-2 rounded-full bg-indigo-500" />}
        </div>
        <input 
          type="radio" 
          name={type} 
          value={value} 
          checked={isChecked} 
          onChange={() => updateSetting(type, value)} 
          className="hidden" 
        />
        <span className="text-sm text-muted-foreground group-hover:text-foreground">{label}</span>
      </label>
    );
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border p-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
            <ScopeBreadcrumb /> <span>›</span> Notifications
          </div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleEnableBrowserNotifications} className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">
            Enable browser notifications
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl space-y-12">
          
          {/* Basic Section */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-6">Basic</h2>
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Desktop</h3>
                <RadioOption label="All notifications" type="desktop" value="all" />
                <RadioOption label="Smart notifications" type="desktop" value="smart" />
                <RadioOption label="No notifications" type="desktop" value="none" />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Mobile</h3>
                <RadioOption label="All notifications" type="mobile" value="all" />
                <RadioOption label="Smart notifications" type="mobile" value="smart" />
                <RadioOption label="No notifications" type="mobile" value="none" />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Email</h3>
                <RadioOption label="All notifications" type="email" value="all" />
                <RadioOption label="Smart notifications" type="email" value="smart" />
                <RadioOption label="No notifications" type="email" value="none" />
              </div>
            </div>
          </section>

          <div className="h-px bg-muted/50 w-full" />

          {/* Advanced Section */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-6">Advanced</h2>
            
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Notification rules</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Notifications rules allow to customize how a teammate is notified. Advanced notifications will override basic notifications.
                </p>
              </div>
              <Button asChild variant="outline" className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                <Link href="/settings/notifications/create-rule">
                  Create notification rule
                </Link>
              </Button>
            </div>

            <div className="mt-8">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-10">Loading rules...</p>
              ) : rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3">
                        <Bell className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-muted-foreground">If</span> {rule.trigger} <span className="text-muted-foreground">then</span> {rule.action}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-sm text-muted-foreground">You do not have any notification rules</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
