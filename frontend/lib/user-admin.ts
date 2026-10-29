import { auth } from "@/lib/auth";
import { normalizeAppRole, type AppRole } from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-session";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";


export type ManagedMemberRecord = {
  id: string;
  userId: string;
  organizationId: string;
  role: AppRole;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export async function resolveManagedOrgId(session: AuthSession) {
  const activeOrganizationId =
    (session.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId || null;

  if (activeOrganizationId) {
    return activeOrganizationId;
  }

  // Fallback: list organizations and take the first one
  const organizations = await auth.api.listOrganizations({
    headers: new Headers(), // This might need actual headers from the request in practice
  });

  return organizations?.[0]?.id || null;
}

/**
 * List all members of an organization using Better Auth API.
 */
export async function listManagedMembers(organizationId: string, headers?: Headers) {
  const response = await auth.api.listMembers({
    query: {
      organizationId,
    },
    headers: headers || new Headers(),
  });

  const members = Array.isArray(response) ? response : (response as any)?.members || [];

  return members.map((m: any) => ({
    id: m.id,
    userId: m.userId,
    organizationId: m.organizationId,
    role: normalizeAppRole(m.role),
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    },
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : new Date().toISOString(),
  }));
}

/**
 * Invite a new member using Better Auth API.
 */
export async function inviteMember(organizationId: string, email: string, role: AppRole, headers?: Headers) {
  return await auth.api.createInvitation({
    body: {
      email,
      role,
      organizationId,
    },
    headers: headers || new Headers(),
  });
}

/**
 * Update a member's role using Better Auth API.
 */
export async function updateMemberRole(memberId: string, organizationId: string, role: AppRole, headers?: Headers) {
  return await auth.api.updateMemberRole({
    body: {
      memberId,
      organizationId,
      role,
    },
    headers: headers || new Headers(),
  });
}

/**
 * Remove a member from the organization using Better Auth API.
 */
export async function removeMember(memberId: string, organizationId: string, headers?: Headers) {
  return await auth.api.removeMember({
    body: {
      memberIdOrEmail: memberId,
      organizationId,
    },
    headers: headers || new Headers(),
  });
}

/**
 * Set user password under a managed organization context.
 */
export async function setManagedUserPassword(userId: string, organizationId: string, password: string) {
  const member = await prisma.authmember.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (!member) {
    throw new Error("User does not belong to this organization.");
  }

  const hashedPassword = await hashPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashedPassword,
    },
  });
}

