import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";

import { AuthPanel } from "@/components/snackflow/AuthPanel";
import { Workspace } from "@/components/snackflow/Workspace";
import { useAuthSnapshot } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnackFlow | Factory stock and master data" },
      {
        name: "description",
        content: "Role-based stock, items, customers, suppliers and BOM records for SnackFlow.",
      },
      { property: "og:title", content: "SnackFlow | Factory stock and master data" },
      {
        property: "og:description",
        content: "Role-based stock, items, customers, suppliers and BOM records for SnackFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { status, user } = useAuthSnapshot();

  if (status === "loading") {
    return (
      <main
        className="grid min-h-dvh place-items-center bg-background"
        aria-label="Loading SnackFlow"
      >
        <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-primary" />
      </main>
    );
  }

  if (user) return <Workspace user={user} />;

  return <AuthPanel />;
}
