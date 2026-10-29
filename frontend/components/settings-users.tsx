"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Shield, Trash2, UserPlus, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useOrganizationManagement } from "@/hooks/use-organization-management";
import { AppRole } from "@/lib/auth-roles";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
] as const;

export function SettingsUsers() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  
  const { 
    members, 
    isLoadingMembers, 
    refetchMembers, 
    inviteMember, 
    updateMemberRole, 
    removeMember 
  } = useOrganizationManagement();

  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member" as AppRole,
  });

  const currentUserId = session?.user?.id;
  const currentUserRole = activeOrg?.members?.find((m: any) => m.userId === currentUserId)?.role as AppRole | undefined;
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsInviting(true);

    try {
      const { error: inviteError } = await inviteMember(inviteForm.email, inviteForm.role);
      if (inviteError) throw new Error(inviteError.message || "Failed to send invitation.");
      
      setInviteForm({ email: "", role: "member" });
      setSuccessMessage(`Invitation sent to ${inviteForm.email}`);
      await refetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: AppRole) {
    setError(null);
    setIsUpdatingId(memberId);
    try {
      const { error: updateError } = await updateMemberRole(memberId, newRole);
      if (updateError) throw new Error(updateError.message || "Failed to update role.");
      await refetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsUpdatingId(null);
    }
  }

  async function handleRemove(memberId: string, email: string) {
    if (!window.confirm(`Remove ${email} from the organization?`)) return;
    
    setError(null);
    setIsRemovingId(memberId);
    try {
      const { error: removeError } = await removeMember(memberId);
      if (removeError) throw new Error(removeError.message || "Failed to remove member.");
      await refetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsRemovingId(null);
    }
  }

  if (isSessionPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading team settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Team Management</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Members</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all" 
            onClick={() => void refetchMembers()} 
            disabled={isLoadingMembers}
          >
            <RefreshCw className={cn("size-4", isLoadingMembers && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[400px_1fr] mt-4">
        {/* INVITE MEMBER CARD */}
        {canManage && (
          <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl h-fit">
            <div className="mb-6 pb-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <UserPlus className="size-5 text-primary" />
                Invite Teammate
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Send an invitation link to your teammate. They will set their own password upon joining.
              </p>
            </div>
            <form className="space-y-5" onSubmit={handleInvite}>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="teammate@company.com"
                    className="h-11 pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(val) => setInviteForm(prev => ({ ...prev, role: val as AppRole }))}
                >
                  <SelectTrigger className="h-11 bg-muted/50 border-border text-foreground focus:ring-primary/20">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="focus:bg-muted focus:text-foreground cursor-pointer">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t border-border mt-2">
                <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isInviting}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* MEMBERS LIST CARD */}
        <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0">
          <div className="mb-6 pb-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Workspace Members</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Active teammates who have access to this shared inbox.
            </p>
            {error && <p className="text-sm text-red-400 mt-2 font-medium">{error}</p>}
            {successMessage && <p className="text-sm text-emerald-500 mt-2 font-medium">{successMessage}</p>}
          </div>

          <div className="space-y-3 overflow-y-auto pr-2">
            {isLoadingMembers && <p className="text-sm text-muted-foreground font-medium">Loading members...</p>}
            {!isLoadingMembers && members.length === 0 && (
              <p className="text-sm text-muted-foreground font-medium">No members found.</p>
            )}

            {!isLoadingMembers && members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;

              return (
                <article key={member.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-5 hover:bg-primary/[0.03] hover:border-primary/30 transition-all">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <p className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">{member.user.name}</p>
                      {isCurrentUser && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/20">
                          You
                        </span>
                      )}
                      <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border capitalize">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {canManage && !isCurrentUser && (
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.id, val as AppRole)}
                        disabled={isUpdatingId === member.id}
                      >
                        <SelectTrigger className="h-9 w-32 bg-muted border-border text-xs text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-white">
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {canManage && !isCurrentUser && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 bg-red-500/5 border-red-500/10 text-red-500/70 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-colors"
                        disabled={isRemovingId === member.id}
                        onClick={() => handleRemove(member.id, member.user.email)}
                      >
                        {isRemovingId === member.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
