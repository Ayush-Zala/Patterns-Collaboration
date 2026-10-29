import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { normalizeAppRole } from "@/lib/auth-roles";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isSignInRoute = pathname === "/sign-in";
  const isSignUpRoute = pathname === "/sign-up";
  const isAcceptInvitationRoute = pathname === "/accept-invitation";
  const isApiInvitationRoute = pathname.startsWith("/api/invitations");

  if (isAuthRoute || isAcceptInvitationRoute || isSignUpRoute || isApiInvitationRoute) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (isApiRoute) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId =
      (session.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId || null;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(session.user.id));
    requestHeaders.set("x-user-role", normalizeAppRole((session.user as { role?: unknown }).role));
    if (activeOrganizationId) {
      requestHeaders.set("x-org-id", activeOrganizationId);
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (!session && !isSignInRoute && !isSignUpRoute && !isAcceptInvitationRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (session && isSignInRoute) {
    return NextResponse.redirect(new URL("/settings/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
