import { FormEvent, useState } from "react";
import { ArrowRight, Factory, LoaderCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      if (!data.session) {
        setNotice({
          tone: "success",
          text: "Check your email to confirm your account. Access is available only for an assigned staff role.",
        });
      }
    } catch {
      setNotice({
        tone: "error",
        text:
          mode === "sign-in"
            ? "We couldn’t sign you in. Check your email and password."
            : "We couldn’t create that account. Check the details or try signing in.",
      });
    } finally {
      setBusy(false);
    }
  }

  const isSigningUp = mode === "sign-up";

  return (
    <main className="grid min-h-dvh bg-background md:grid-cols-[minmax(0,1fr)_minmax(390px,0.85fr)]">
      <section className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-sidebar px-7 py-8 text-sidebar-foreground sm:px-10 md:min-h-dvh md:px-14 md:py-12">
        <div className="hidden items-center gap-3 md:flex">
          <span className="grid size-11 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Factory aria-hidden="true" className="size-5" />
          </span>
          <span className="text-sm font-semibold">SnackFlow</span>
        </div>
        <div className="relative z-10 max-w-xl py-10 md:py-0">
          <p className="mb-4 text-xs font-semibold uppercase text-sidebar-primary">
            Factory operations · Tamil Nadu
          </p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
            SnackFlow
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-sidebar-foreground/75">
            Murukku, mixture, chips and sweets — one clear view of the work behind every batch.
          </p>
        </div>
        <div className="relative z-10 hidden items-center gap-3 border-t border-sidebar-border pt-5 text-xs text-sidebar-foreground/70 md:flex">
          <span className="size-2 rounded-full bg-sidebar-primary" />
          <span>Stock balances follow the movement ledger</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8 md:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Factory aria-hidden="true" className="size-5" />
              </span>
              <span className="text-lg font-semibold">SnackFlow</span>
            </div>
          </div>

          <div className="mb-7">
            <p className="text-sm font-medium text-primary">Staff &amp; administrator access</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {isSigningUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isSigningUp
                ? "Use the email assigned to your staff role."
                : "Sign in with your assigned account to open your factory workspace."}
            </p>
          </div>

          {!isSigningUp ? (
            <Button
              className="mb-5 h-10"
              onClick={() => {
                setEmail("admin@snackflow.test");
                setNotice(null);
              }}
              type="button"
              variant="outline"
            >
              <ShieldCheck aria-hidden="true" />
              Administrator sign-in
            </Button>
          ) : null}

          <div className="mb-5 flex w-full border-b border-border">
            <Button
              className={`h-10 rounded-none border-b-2 px-4 ${!isSigningUp ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => {
                setMode("sign-in");
                setNotice(null);
              }}
              type="button"
              variant="ghost"
            >
              Sign in
            </Button>
            <Button
              className={`h-10 rounded-none border-b-2 px-4 ${isSigningUp ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => {
                setMode("sign-up");
                setNotice(null);
              }}
              type="button"
              variant="ghost"
            >
              Create account
            </Button>
          </div>

          <form className="space-y-4" onSubmit={submitCredentials}>
            {isSigningUp ? (
              <>
                <label className="block space-y-2 text-sm font-medium" htmlFor="staff-name">
                  Display name
                  <Input
                    autoComplete="name"
                    id="staff-name"
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                    value={displayName}
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium" htmlFor="staff-phone">
                  Phone number <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input
                    autoComplete="tel"
                    id="staff-phone"
                    onChange={(event) => setPhone(event.target.value)}
                    type="tel"
                    value={phone}
                  />
                </label>
              </>
            ) : null}
            <label className="block space-y-2 text-sm font-medium" htmlFor="staff-email">
              Email address
              <Input
                autoComplete="email"
                id="staff-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium" htmlFor="staff-password">
              Password
              <Input
                autoComplete={isSigningUp ? "new-password" : "current-password"}
                id="staff-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {notice ? (
              <p
                className={`rounded-md border px-3 py-2.5 text-sm ${notice.tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}`}
                role={notice.tone === "error" ? "alert" : "status"}
              >
                {notice.text}
              </p>
            ) : null}

            <Button className="w-full" disabled={busy} type="submit">
              {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              {isSigningUp ? "Create account" : "Sign in"}
              {!busy ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            Only accounts with an assigned factory role can open the workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
