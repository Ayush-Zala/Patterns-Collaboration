import { NextRequest } from "next/server";

import { normalizeAppRole, type AppRole } from "@/lib/auth-roles";
import { auth } from "@/lib/auth";

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getRequestSession(request: NextRequest): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

export function getSessionRole(session: AuthSession): AppRole {
  return normalizeAppRole((session.user as { role?: unknown }).role);
}
