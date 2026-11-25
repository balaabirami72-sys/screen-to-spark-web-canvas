import { FormEvent, useState } from "react";
import { ArrowRight, Factory, LoaderCircle } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
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

  async function signInWithProvider(provider: "google" | "lovable") {
    setBusy(true);
    setNotice(null);

    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch {
      setNotice({
        tone: "error",
        text: `We couldn’t start ${provider === "google" ? "Google" : "Lovable"} sign-in.`,
      });
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
            <p className="text-sm font-medium text-primary">Staff access</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {isSigningUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isSigningUp
                ? "Use the email assigned to your staff role."
                : "Sign in to your factory workspace."}
            </p>
          </div>

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

          <div className="my-5 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="h-11 border-border bg-surface-raised text-foreground shadow-none hover:bg-muted"
              disabled={busy}
              onClick={() => void signInWithProvider("google")}
              type="button"
              variant="outline"
            >
              <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </Button>
            <Button
              className="h-11 border-border bg-surface-raised text-foreground shadow-none hover:bg-muted"
              disabled={busy}
              onClick={() => void signInWithProvider("lovable")}
              type="button"
              variant="outline"
            >
              <LovableMark className="size-[18px]" />
              Continue with Lovable
            </Button>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            Only accounts with an assigned factory role can open the workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
