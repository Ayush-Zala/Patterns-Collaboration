"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox, Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CreateNotificationRulePage() {
  const router = useRouter();
  const [trigger, setTrigger] = useState("I am assigned a new conversation from");
  const [inboxId, setInboxId] = useState("any");
  const [action, setAction] = useState("Don't notify me");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inboxes, setInboxes] = useState<any[]>([]);

  useEffect(() => {
    async function loadInboxes() {
      try {
        const res = await fetch("/api/settings/inboxes");
        if (res.ok) {
          const data = await res.json();
          setInboxes(data.inboxes || data);
        }
      } catch (err) {
        console.error("Failed to fetch inboxes:", err);
      }
    }
    loadInboxes();
  }, []);

  const triggers = [
    "A message arrives in",
    "A new message is sent from",
    "I am assigned a new conversation from",
    "I am @mentioned in a comment in",
    "I am invited to a new conversation in",
    "I receive a reminder for a snoozed conversation in",
    "A new activity occurs in my assigned conversation from",
    "A new activity occurs in conversation I follow in",
    "A sent message failed to be delivered from",
    "I am notified by a rule automatically"
  ];

  const actions = [
    "Don't notify me",
    "Notify me on desktop",
    "Notify me on mobile",
    "Notify me by email"
  ];

  async function handleSave() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/settings/user-settings/notification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger, inboxId, action }),
      });
      if (res.ok) {
        router.push("/settings/notifications");
      } else {
        alert("Failed to save rule");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving rule");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground shrink-0">
            <Link href="/settings/notifications">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
              <ScopeBreadcrumb /> <span>›</span> Notifications
            </div>
            <h1 className="text-xl font-bold text-foreground">Create notification rule</h1>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
        >
          {isSubmitting ? "Saving..." : "Save rule"}
        </Button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl space-y-10">
          
          {/* IF Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">If</h2>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center border border-border shrink-0">
                <Inbox className="size-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger className="w-auto min-w-[300px] bg-muted/50 border-border">
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {triggers.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={inboxId} onValueChange={setInboxId}>
                  <SelectTrigger className="w-[180px] bg-muted/50 border-border">
                    <div className="flex items-center gap-2">
                      <Inbox className="size-3 text-muted-foreground" />
                      <SelectValue placeholder="Select inbox" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any inbox</SelectItem>
                    {inboxes.map(inbox => (
                      <SelectItem key={inbox.id} value={inbox.id}>{inbox.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* THEN Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Then</h2>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center border border-border shrink-0">
                <Bell className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="w-auto min-w-[250px] bg-muted/50 border-border">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
