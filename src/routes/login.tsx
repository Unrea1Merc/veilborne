import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { COMPANY, GAME_TAG, GAME_TITLE } from "@/game/data";
import { SoftBtn } from "@/components/game/widgets";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function googleOrX(providerId: string) {
    setError(null);
    setBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(null);
    }
  }

  async function emailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || "Walker",
        });
        if (err) throw new Error(err.message ?? "Could not create account");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message ?? "Could not sign in");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      setBusy(null);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-5 py-10">
      <img src="/art/title.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-bg/70" />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-surface/95 p-5 ring-1 ring-border">
        <p className="font-display text-[11px] tracking-[0.28em] text-gold uppercase">{COMPANY}</p>
        <h1 className="mt-2 font-display text-2xl tracking-wide text-fg">{GAME_TITLE}</h1>
        <p className="mt-1 text-sm text-fg">
          Link Google to carry your walker to another phone. X and email work too. {GAME_TAG} waits
          on both sides of the Veil.
        </p>

        {!authEnabled ? (
          <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            {GROK_PROVIDERS.map((p) => (
              <SoftBtn
                key={p.providerId}
                primary={p.label === "Google"}
                className="w-full py-3"
                disabled={busy !== null}
                onClick={() => void googleOrX(p.providerId)}
              >
                {busy === p.providerId ? "Opening…" : `Continue with ${p.label}`}
              </SoftBtn>
            ))}

            <div className="my-2 flex items-center gap-3 text-[11px] tracking-wide text-faint uppercase">
              <span className="h-px flex-1 bg-border" />
              Email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="flex flex-col gap-2" onSubmit={(e) => void emailAuth(e)}>
              {mode === "up" ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="h-11 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
                />
              ) : null}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-11 rounded-md bg-raised px-3 text-base text-fg ring-1 ring-border outline-none"
              />
              <SoftBtn primary={false} type="submit" className="w-full py-3" disabled={busy !== null}>
                {busy === "email" ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"}
              </SoftBtn>
            </form>
            <button
              type="button"
              className="min-h-11 text-sm text-muted"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Already linked? Sign in" : "New here? Create an email account"}
            </button>
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
