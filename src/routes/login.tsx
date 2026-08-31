import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { COMPANY, GAME_TITLE } from "@/game/data";
import { SoftBtn } from "@/components/game/widgets";

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: (s: Record<string, unknown>): { err?: string } => {
    if (typeof s.err === "string" && s.err) return { err: s.err };
    return {};
  },
});

const BEARER_KEY = "grok-auth.bearer-token";

function keepToken(token: unknown) {
  if (typeof token !== "string" || !token) return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* ignore */
  }
}

function Login() {
  const { err } = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    err ? "Google didn't finish on this phone. Create an email account below — that vault is live." : null,
  );

  async function googleOrX(providerId: string) {
    setError(null);
    setBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login?err=google" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(null);
    }
  }

  async function emailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (mode === "up") {
        const { data, error: fail } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || "Walker",
        });
        if (fail) throw new Error(fail.message ?? "Could not create account");
        keepToken((data as { token?: string } | null)?.token);
      } else {
        const { data, error: fail } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (fail) throw new Error(fail.message ?? "Could not sign in");
        keepToken((data as { token?: string } | null)?.token);
      }
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
      setBusy(null);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-bg px-5 py-[max(1.5rem,var(--safe-top))] pb-[max(1.5rem,var(--safe-bottom))]">
      <img src="/art/title.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-bg/70" />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-surface/95 p-5 ring-1 ring-border">
        <p className="font-display text-[11px] tracking-[0.28em] text-gold uppercase">{COMPANY}</p>
        <h1 className="mt-2 font-display text-2xl tracking-wide text-fg">{GAME_TITLE}</h1>
        <p className="mt-1 text-sm text-fg">Create an account so this walker follows you to another phone.</p>

        {!authEnabled ? (
          <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex rounded-md bg-raised p-1 ring-1 ring-border">
              <button
                type="button"
                className={`min-h-11 flex-1 rounded-sm font-display text-sm ${mode === "up" ? "bg-accent text-accent-fg" : "text-muted"}`}
                onClick={() => setMode("up")}
              >
                Create account
              </button>
              <button
                type="button"
                className={`min-h-11 flex-1 rounded-sm font-display text-sm ${mode === "in" ? "bg-accent text-accent-fg" : "text-muted"}`}
                onClick={() => setMode("in")}
              >
                Sign in
              </button>
            </div>

            <form className="flex flex-col gap-2" onSubmit={(e) => void emailAuth(e)}>
              {mode === "up" ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Walker name"
                  autoComplete="nickname"
                  className="h-12 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
                />
              ) : null}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "up" ? "Password (8+ characters)" : "Password"}
                className="h-12 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
              />
              <SoftBtn primary type="submit" className="w-full py-3" disabled={busy !== null}>
                {busy === "email" ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
              </SoftBtn>
            </form>

            <div className="my-1 flex items-center gap-3 text-[11px] tracking-wide text-faint uppercase">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            {GROK_PROVIDERS.map((p) => (
              <SoftBtn
                key={p.providerId}
                className="w-full py-3"
                disabled={busy !== null}
                onClick={() => void googleOrX(p.providerId)}
              >
                {busy === p.providerId ? "Opening…" : `Continue with ${p.label}`}
              </SoftBtn>
            ))}

            {error ? <p className="text-sm text-hp">{error}</p> : null}
          </div>
        )}

        <Link to="/" className="mt-5 block min-h-11 text-center text-sm text-muted">
          Play as a guest
        </Link>
      </div>
    </main>
  );
}
