"use client";

import { useEffect, useState } from "react";
import { Mail, Users, Check, X, Copy, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InviteTeammateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [selectedInboxes, setSelectedInboxes] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setInvitationLink(null);
      fetch("/api/settings/inboxes").then(res => res.json()).then(data => setInboxes(data.inboxes || []));
    }
  }, [open]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, metadata: { initialInboxes: selectedInboxes } }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      if (data.invite?.id) {
        setInvitationLink(`${window.location.origin}/accept-invitation?id=${data.invite.id}`);
      } else {
        // Fallback if no link but success
        onOpenChange(false);
      }
    } catch (e: any) {
      alert(e.message || "Error sending invitation");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-zinc-950 text-foreground border-border sm:max-w-[450px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground">Invite Teammate</SheetTitle>
          <SheetDescription>Assign access and send an invite.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {invitationLink ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                  <Check className="size-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold">Invitation Sent!</h3>
                <p className="text-sm text-muted-foreground">We've sent an email to {email}. You can also share the link below manually.</p>
              </div>

              <div className="p-4 bg-card border border-border rounded-xl space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Invitation Link</p>
                <code className="block p-3 bg-black/40 rounded-lg text-[13px] font-mono break-all text-emerald-400">
                  {invitationLink}
                </code>
                <Button 
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white" 
                  onClick={() => {
                    navigator.clipboard.writeText(invitationLink);
                  }}
                >
                  <Copy className="size-4" />
                  Copy Link
                </Button>
              </div>

              <Button variant="outline" className="w-full border-border" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                <Input value={email} onChange={e => setEmail(e.target.value)} className="bg-card border-border" placeholder="teammate@company.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Role</label>
                <div className="flex gap-2">
                  {['member', 'admin'].map(r => (
                    <Button key={r} variant={role === r ? "default" : "outline"} onClick={() => setRole(r)} className="flex-1 capitalize h-11">
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
              <Button className="w-full h-11" onClick={() => setStep(2)} disabled={!email}>Next</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-xs font-bold text-muted-foreground uppercase">Access & Inbox Assignment</label>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {inboxes.map(i => (
                  <div key={i.id} onClick={() => setSelectedInboxes(p => p.includes(i.id) ? p.filter(id => id !== i.id) : [...p, i.id])} className={cn("p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center group", selectedInboxes.includes(i.id) ? "border-primary bg-primary/5" : "border-border hover:border-border hover:bg-muted/50")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("size-2 rounded-full", selectedInboxes.includes(i.id) ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "bg-zinc-700")} />
                      <span className="text-sm font-medium">{i.name}</span>
                    </div>
                    {selectedInboxes.includes(i.id) && <Check className="size-4 text-primary" />}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 border-border h-11" onClick={() => setStep(1)} disabled={isSending}>Back</Button>
                <Button className="flex-[2] h-11" onClick={handleSend} disabled={isSending || selectedInboxes.length === 0}>
                  {isSending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Mail className="size-4 mr-2" />}
                  {isSending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
