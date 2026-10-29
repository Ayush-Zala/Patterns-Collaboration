import { auth } from "@/lib/auth";
import { normalizeAppRole } from "@/lib/auth-roles";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

type OrganizationRecord = {
  id: string;
  slug?: string | null;
  name?: string | null;
};

type MemberRecord = {
  id: string;
  organizationId: string;
  role: string;
};

function slugifyOrgName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function resolveWorkspaceSeed(session: NonNullable<AuthSession>): string {
  const user = session.user as { name?: string | null; email?: string | null };
  const emailPrefix = user.email?.split("@")[0] || "workspace";
  return user.name?.trim() || emailPrefix;
}

export async function ensureOrgMembership(session: AuthSession, requestHeaders: Headers) {
  if (!session?.user?.id) return null;

  const desiredRole = normalizeAppRole((session.user as { role?: unknown }).role);
  let organizationId = (session.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId || null;

  const organizationsResponse = await auth.api
    .listOrganizations({ headers: requestHeaders })
    .catch(() => [] as OrganizationRecord[]);

  const organizations = Array.isArray(organizationsResponse) ? organizationsResponse : [];

  if (!organizations.length) {
    const seed = resolveWorkspaceSeed(session);
    const slugSeed = slugifyOrgName(`${seed}-${session.user.id.slice(0, 6)}`) || `workspace-${session.user.id.slice(0, 6)}`;

    const created = (await auth.api.createOrganization({
      headers: requestHeaders,
      body: {
        name: `${seed} Workspace`,
        slug: slugSeed,
      },
    })) as OrganizationRecord | null;

    organizationId = created?.id || null;
  } else if (!organizationId) {
    organizationId = organizations[0]?.id || null;
  }

  if (!organizationId) return null;

  if ((session.session as { activeOrganizationId?: string | null }).activeOrganizationId !== organizationId) {
    await auth.api.setActiveOrganization({
      headers: requestHeaders,
      body: { organizationId },
    });
  }

  const activeMember = (await auth.api.getActiveMember({ headers: requestHeaders }).catch(() => null)) as MemberRecord | null;

  if (activeMember?.id && activeMember.role !== desiredRole) {
    await auth.api
      .updateMemberRole({
        headers: requestHeaders,
        body: {
          memberId: activeMember.id,
          organizationId: activeMember.organizationId,
          role: desiredRole,
        },
      })
      .catch(() => null);
  }

  return {
    organizationId,
    role: desiredRole,
  };
}
