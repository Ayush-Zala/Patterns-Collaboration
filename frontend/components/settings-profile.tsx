"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function SettingsProfile() {
  const { data: sessionData, isPending } = authClient.useSession();
  const user = sessionData?.user as Record<string, any> | undefined;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("********");
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
      setIsTwoFactorEnabled(!!user.twoFactorEnabled);
    }
  }, [user]);

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedMessage("Profile updated successfully.");
    setTimeout(() => setSavedMessage(null), 1600);
  }

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">General</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4 max-w-4xl">
        <div className="mb-6 pb-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Personal Details</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal information and security preferences.
          </p>
        </div>

        <div className="overflow-y-auto pr-2 pb-4">
          <form className="grid gap-6 sm:grid-cols-2" onSubmit={onSave}>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">First Name</label>
              <Input 
                value={firstName} 
                onChange={(event) => setFirstName(event.target.value)} 
                className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Last Name</label>
              <Input 
                value={lastName} 
                onChange={(event) => setLastName(event.target.value)} 
                className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
              <Input 
                value={username} 
                onChange={(event) => setUsername(event.target.value)} 
                className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mail</label>
              <Input 
                type="email" 
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
            
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-5 mt-2">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-base font-bold text-foreground">Two Factor Authentication</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Add an extra verification layer while signing in.</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTwoFactorEnabled}
                    onChange={(event) => setIsTwoFactorEnabled(event.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </label>
            </div>
            
            <div className="sm:col-span-2 flex items-center justify-between pt-4 border-t border-border mt-2">
              <div className="flex items-center gap-2">
                <Button type="submit" className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                  Save Profile
                </Button>
                {savedMessage && (
                  <p className="inline-flex items-center gap-2 text-sm text-emerald-500 font-medium ml-4 animate-in slide-in-from-left-2">
                    <CheckCircle2 className="size-4" />
                    {savedMessage}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="size-4" />
                Security settings are managed per profile
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
