"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/context/workspace-store";
import { AppRole } from "@/lib/auth-roles";

/**
 * Hook to manage organization members using Better Auth client.
 */
export function useOrganizationManagement() {
  const { scopeId: storeScopeId } = useWorkspaceStore();
  const { data: activeOrg } = authClient.useActiveOrganization();
  
  const organizationId = storeScopeId === "global" ? activeOrg?.id : storeScopeId;
  
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<any>(null);

  const fetchMembers = useCallback(async () => {
    if (!organizationId || organizationId === "none") {
      setIsLoadingMembers(false);
      return;
    }
    setIsLoadingMembers(true);
    try {
      // Direct call to better-auth client (not using the hook)
      const res = await authClient.organization.listMembers({
        query: { organizationId }
      });
      const data = res.data;
      const list = Array.isArray(data) ? data : (data as any)?.members || [];
      const normalizedList = list.map((m: any) => ({
        ...m,
        role: m.role as AppRole,
      }));
      setMembers(normalizedList);
      setMembersError(null);
      return normalizedList;
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setMembersError(err);
      return [];
    } finally {
      setIsLoadingMembers(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = async (email: string, role: AppRole) => {
    return await authClient.organization.inviteMember({
      email,
      role,
      organizationId,
    });
  };

  const updateMemberRole = async (memberId: string, role: AppRole) => {
    return await authClient.organization.updateMemberRole({
      memberId,
      role,
      organizationId,
    });
  };

  const removeMember = async (memberId: string) => {
    return await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId,
    });
  };

  return {
    members,
    isLoadingMembers,
    membersError,
    // Ensure refetch is returned correctly
    refetchMembers: fetchMembers,
    // Direct fetch as a fallback
    fetchMembersDirect: async () => {
      return await fetchMembers();
    },
    inviteMember,
    updateMemberRole,
    removeMember,
  };
}
