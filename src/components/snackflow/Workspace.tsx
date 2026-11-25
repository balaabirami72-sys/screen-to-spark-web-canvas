import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Boxes,
  ContactRound,
  Factory,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  ScrollText,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  canManageBom,
  canManageMasters,
  canPostAdjustments,
  getRoleNavigation,
  roleLabels,
  screenLabels,
  type AppRole,
  type WorkspaceView,
} from "@/lib/snackflow";
import {
  BomScreen,
  CustomersScreen,
  ItemsScreen,
  StaffAccessScreen,
  SuppliersScreen,
} from "./MasterDataScreens";
import { StockLedgerScreen, StockSummaryScreen } from "./StockScreens";
import { LoadingState } from "./Shared";

const navigationIcons: Record<WorkspaceView, LucideIcon> = {
  "stock-summary": LayoutDashboard,
  "stock-ledger": ScrollText,
  items: Boxes,
  customers: ContactRound,
  suppliers: Truck,
  bom: BookOpenText,
  staff: ShieldCheck,
};

export function Workspace({ user }: { user: User }) {
  const rolesQuery = useQuery({
    queryKey: ["user-roles", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return Array.from(new Set(data.map((row) => row.role)));
    },
  });
  const [activeView, setActiveView] = useState<WorkspaceView>("stock-summary");

  if (rolesQuery.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <LoadingState label="Loading workspace" />
      </div>
    );
  }

  if (rolesQuery.isError) {
    return (
      <WorkspaceMessage
        title="Workspace access could not be checked."
        detail="Sign out and try again, or contact the workspace administrator."
      />
    );
  }

  const roles = rolesQuery.data ?? [];
  const navigation = getRoleNavigation(roles);
  if (roles.length === 0) {
    return (
      <WorkspaceMessage
        title="No staff role is assigned to this account."
        detail="Ask a workspace administrator to assign access to this email address."
      />
    );
  }

  if (navigation.length === 0) {
    return (
      <WorkspaceMessage
        title="No Phase 1 screens are assigned to this role."
        detail="Your account is signed in, but this release does not include the salesman workspace."
      />
    );
  }

  const selectedView = navigation.includes(activeView)
    ? activeView
    : (navigation[0] ?? "stock-summary");
  const roleLabel = roles.map((role) => roleLabels[role]).join(" · ");
  const canEditMasters = canManageMasters(roles);
  const canAdjustStock = canPostAdjustments(roles);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-dvh flex-col bg-sidebar px-4 py-5 text-sidebar-foreground md:flex">
        <Brand />
        <div className="mt-10 border-b border-sidebar-border pb-5">
          <p className="text-xs font-semibold uppercase text-sidebar-foreground/60">Signed in as</p>
          <p className="mt-2 truncate text-sm font-medium">{user.email ?? "Staff account"}</p>
          <p className="mt-1 text-xs text-sidebar-primary">{roleLabel}</p>
        </div>
        <nav aria-label="Main navigation" className="mt-5 flex-1 space-y-1">
          <p className="px-3 pb-2 text-xs font-semibold uppercase text-sidebar-foreground/55">
            Workspace
          </p>
          {navigation.map((view) => (
            <NavigationButton
              active={view === selectedView}
              key={view}
              onClick={() => setActiveView(view)}
              view={view}
            />
          ))}
        </nav>
        <Button
          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => void signOut()}
          type="button"
          variant="ghost"
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground md:hidden">
              <Factory aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="hidden text-xs text-muted-foreground md:block">
                SnackFlow / {roleLabel}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {screenLabels[selectedView]}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:block">
              {user.email}
            </span>
            <Button
              aria-label="Sign out"
              className="md:hidden"
              onClick={() => void signOut()}
              size="icon"
              title="Sign out"
              type="button"
              variant="ghost"
            >
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </header>

        <nav
          aria-label="Workspace sections"
          className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden"
        >
          {navigation.map((view) => (
            <NavigationButton
              active={view === selectedView}
              key={view}
              onClick={() => setActiveView(view)}
              view={view}
              compact
            />
          ))}
        </nav>

        <main className="mx-auto min-w-0 max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <WorkspaceContent roles={roles} selectedView={selectedView} user={user} />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="grid size-10 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Factory aria-hidden="true" className="size-5" />
      </span>
      <span className="text-base font-semibold">SnackFlow</span>
    </div>
  );
}

function NavigationButton({
  view,
  active,
  onClick,
  compact = false,
}: {
  view: WorkspaceView;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = navigationIcons[view];
  return (
    <Button
      className={
        compact
          ? `h-10 shrink-0 px-3 ${active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`
          : `w-full justify-start ${active ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`
      }
      onClick={onClick}
      type="button"
      variant={active ? "secondary" : "ghost"}
    >
      <Icon aria-hidden="true" />
      {screenLabels[view]}
    </Button>
  );
}

function WorkspaceContent({
  selectedView,
  roles,
  user,
}: {
  selectedView: WorkspaceView;
  roles: AppRole[];
  user: User;
}) {
  switch (selectedView) {
    case "stock-summary":
      return <StockSummaryScreen canAdjust={canPostAdjustments(roles)} />;
    case "stock-ledger":
      return <StockLedgerScreen roles={roles} />;
    case "items":
      return <ItemsScreen canEdit={canManageMasters(roles)} />;
    case "customers":
      return <CustomersScreen canEdit={canManageMasters(roles)} />;
    case "suppliers":
      return <SuppliersScreen canEdit={canManageMasters(roles)} />;
    case "bom":
      return <BomScreen canEdit={canManageBom(roles)} />;
    case "staff":
      return <StaffAccessScreen roles={roles} userId={user.id} />;
    default:
      return <StockSummaryScreen canAdjust={canPostAdjustments(roles)} />;
  }
}

function WorkspaceMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-12">
      <section className="w-full max-w-lg border-y border-border py-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-md bg-secondary text-secondary-foreground">
          <PackageSearch aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-foreground">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>
        <Button
          className="mt-6"
          onClick={() => void supabase.auth.signOut()}
          type="button"
          variant="outline"
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </section>
    </main>
  );
}
