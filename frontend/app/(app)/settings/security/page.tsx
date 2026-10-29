"use client"

import { useState } from "react";
import { Layers, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SecurityPage() {
  const [ssoType, setSsoType] = useState("disabled");
  const [trashDays, setTrashDays] = useState("never");

  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-500 p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 font-medium">
        <Layers className="h-3.5 w-3.5" />
        <span>Company</span>
      </div>
      <h1 className="text-[28px] font-bold tracking-tight mb-4 text-foreground/90">Security</h1>

      <div className="flex items-center gap-6 border-b border-border/50 mb-6">
        <div className="pb-3 border-b-2 border-foreground text-[14.5px] font-bold text-foreground">General</div>
      </div>

      <div className="relative w-64 mb-10">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search" 
          className="pl-9 bg-card/20 border-border/50 h-9 rounded-md text-[13px]"
        />
      </div>

      <div className="mb-8">
        <h2 className="text-[15px] font-bold mb-1.5 text-foreground/90">Single sign on</h2>
        <p className="text-[13.5px] text-muted-foreground mb-5">Select how teammates with sign in to Front.</p>
        
        <div className="space-y-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input 
                type="radio" 
                name="sso" 
                value="disabled"
                checked={ssoType === "disabled"}
                onChange={() => setSsoType("disabled")}
                className="peer sr-only"
              />
              <div className="h-4 w-4 rounded-full border border-muted-foreground/60 peer-checked:border-indigo-500 peer-checked:border-[5px] transition-all bg-transparent"></div>
            </div>
            <div>
              <div className={cn("text-[14.5px] font-semibold mb-1 transition-colors", ssoType === "disabled" ? "text-foreground" : "text-foreground/70")}>Disabled</div>
              <div className="text-[13.5px] text-muted-foreground">Teammates sign in with their email and password.</div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input 
                type="radio" 
                name="sso" 
                value="google"
                checked={ssoType === "google"}
                onChange={() => setSsoType("google")}
                className="peer sr-only"
              />
              <div className="h-4 w-4 rounded-full border border-muted-foreground/60 peer-checked:border-indigo-500 peer-checked:border-[5px] transition-all bg-transparent"></div>
            </div>
            <div>
              <div className={cn("text-[14.5px] font-semibold mb-1 transition-colors", ssoType === "google" ? "text-foreground" : "text-foreground/70")}>Google or Office 365 login</div>
              <div className="text-[13.5px] text-muted-foreground max-w-3xl">
                Teammates will be required to log in with their Google or Office 365 account rather than email and password. You must be logged in with Google or Office 365 account to enable this setting.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group border-b border-border/30 pb-8">
            <div className="relative flex items-center justify-center mt-0.5">
              <input 
                type="radio" 
                name="sso" 
                value="saml"
                checked={ssoType === "saml"}
                onChange={() => setSsoType("saml")}
                className="peer sr-only"
              />
              <div className="h-4 w-4 rounded-full border border-muted-foreground/60 peer-checked:border-indigo-500 peer-checked:border-[5px] transition-all bg-transparent"></div>
            </div>
            <div>
              <div className={cn("text-[14.5px] font-semibold mb-1 transition-colors", ssoType === "saml" ? "text-foreground" : "text-foreground/70")}>SAML</div>
              <div className="text-[13.5px] text-muted-foreground max-w-3xl">
                Require teammates to sign in using your company's identity provider. Read our <Link href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">SSO documentation</Link>.
              </div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-bold mb-4 text-foreground/90">Data deletion</h2>
        
        <div className="flex items-start justify-between gap-12 max-w-4xl">
          <div>
            <div className="text-[14.5px] font-semibold mb-1 text-foreground/90">Automatically trash inactive conversations after</div>
            <div className="text-[13.5px] text-muted-foreground">
              Conversations will be moved to trash if there is no activity (such as commenting, assigning or tagging) after a defined period of time.
            </div>
          </div>
          
          <Select value={trashDays} onValueChange={setTrashDays}>
            <SelectTrigger className="w-[110px] h-9 bg-card/20 border-border/50 text-[13.5px] font-medium shadow-none focus:ring-1 focus:ring-indigo-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border/50 shadow-md">
              <SelectItem value="never" className="text-[13.5px] font-medium py-2">Never</SelectItem>
              <SelectItem value="7" className="text-[13.5px] font-medium py-2">7 days</SelectItem>
              <SelectItem value="21" className="text-[13.5px] font-medium py-2">21 days</SelectItem>
              <SelectItem value="90" className="text-[13.5px] font-medium py-2">90 days</SelectItem>
              <SelectItem value="365" className="text-[13.5px] font-medium py-2">365 days</SelectItem>
              <SelectItem value="custom" className="text-[13.5px] font-medium py-2">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
