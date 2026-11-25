import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type WorkspaceView =
  "stock-summary" | "stock-ledger" | "items" | "customers" | "suppliers" | "bom" | "staff";

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  accountant: "Accountant",
  owner: "Owner",
  production: "Production",
  salesman: "Salesman",
};

export const screenLabels: Record<WorkspaceView, string> = {
  "stock-summary": "Stock summary",
  "stock-ledger": "Stock ledger",
  items: "Items",
  customers: "Customers",
  suppliers: "Suppliers",
  bom: "BOM recipes",
  staff: "Staff access",
};

const screenOrder: readonly WorkspaceView[] = [
  "stock-summary",
  "stock-ledger",
  "items",
  "customers",
  "suppliers",
  "bom",
  "staff",
];

const roleScreens: Record<AppRole, readonly WorkspaceView[]> = {
  admin: ["stock-summary", "stock-ledger", "items", "customers", "suppliers", "bom", "staff"],
  production: ["stock-summary", "stock-ledger", "items", "bom"],
  accountant: ["stock-summary", "stock-ledger"],
  owner: ["stock-summary"],
  salesman: [],
};

export function getRoleNavigation(roles: readonly AppRole[]): WorkspaceView[] {
  const visible = new Set(roles.flatMap((role) => roleScreens[role]));
  return screenOrder.filter((screen) => visible.has(screen));
}

export function canManageMasters(roles: readonly AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("owner");
}

export function canManageBom(roles: readonly AppRole[]): boolean {
  return canManageMasters(roles) || roles.includes("production");
}

export function canPostAdjustments(roles: readonly AppRole[]): boolean {
  return canManageMasters(roles) || roles.includes("production");
}
