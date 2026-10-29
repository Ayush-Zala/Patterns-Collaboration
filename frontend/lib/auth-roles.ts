export type AppRole = "owner" | "admin" | "member";

export function normalizeAppRole(value: unknown): AppRole {
  const role = String(value || "member").toLowerCase();
  if (role === "owner" || role === "admin" || role === "member") {
    return role;
  }
  // Map legacy roles if they still exist in DB
  if (role === "team_lead") return "admin";
  if (role === "sales_agent") return "member";
  
  return "member";
}
