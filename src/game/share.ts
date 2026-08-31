export function betaUrl() {
  const env = import.meta.env.VITE_BETA_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://veilborne-psi.vercel.app";
}

export function betaMessage() {
  const url = betaUrl();
  return `Veilborne closed beta — Unrea1Merc Game Studios

Play on iPhone or Android:
${url}

iPhone: open in Safari → Share → Add to Home Screen
Android: open in Chrome → menu → Install app

Sign in with Google so your walker follows you to another phone.`;
}

export async function shareBeta(): Promise<"shared" | "copied"> {
  const url = betaUrl();
  const text = betaMessage();
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "Veilborne beta", text, url });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
