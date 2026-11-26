import type { ReactNode } from "react";

export function ScreenHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading records" }: { label?: string }) {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground" role="status">
      {label}…
    </div>
  );
}

export function ErrorState({ label = "This section could not be loaded." }: { label?: string }) {
  return (
    <div
      className="border-y border-destructive/30 bg-destructive/5 px-4 py-5 text-sm text-destructive"
      role="alert"
    >
      {label}
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode | undefined }) {
  return (
    <div className="border-y border-dashed border-border px-4 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
