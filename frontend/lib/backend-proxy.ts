import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const backendBaseUrl = (process.env.BACKEND_API_URL || "http://127.0.0.1:4000").replace("localhost", "127.0.0.1");

export function resolveBackendUrl(path: string): string {
  return `${backendBaseUrl}${path}`;
}

/**
 * Extracts identity from session or request headers.
 * Priority: Better Auth Session > x-user-id header > fallback
 */
export async function getBackendHeaders(request?: NextRequest): Promise<Record<string, string>> {
  let userId = "u-admin-1";
  let userRole = "admin";
  let orgId = null;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      userId = session.user.id;
      userRole = (session.user as any).role || "sales_agent";
      orgId = session.session?.activeOrganizationId || null;

      // If activeOrganizationId is missing, try to get the first one they belong to
      if (!orgId) {
        const orgs = await auth.api.listOrganizations({
          headers: await headers(),
        });
        if (orgs && orgs.length > 0) {
          orgId = orgs[0].id;
        }
      }
    } else if (request) {
      userId = request.headers.get("x-user-id") || userId;
      userRole = request.headers.get("x-user-role") || userRole;
      orgId = request.headers.get("x-org-id") || orgId;
    }
  } catch (err) {
    console.error("Error extracting proxy headers:", err);
  }

  const scopeType = request?.headers.get("x-scope-type");
  const scopeId = request?.headers.get("x-scope-id");

  return {
    "x-user-id": userId,
    "x-user-role": userRole,
    ...(orgId ? { "x-org-id": orgId } : {}),
    ...(scopeType ? { "x-scope-type": scopeType } : {}),
    ...(scopeId ? { "x-scope-id": scopeId } : {}),
  };
}

export async function parseBackendJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return {};
  }
  
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return { status: response.status };
  }

  try {
    return await response.json();
  } catch {
    return { error: "Unexpected backend response", status: response.status };
  }
}
