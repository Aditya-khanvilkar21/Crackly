/**
 * Network-guarded submission helpers.
 *
 * Purpose: when a super admin has spent time building a test, a flaky network
 * must never silently swallow the work. These helpers fail fast on offline /
 * unreachable states and never touch the caller's form state — the caller only
 * resets its state after a successful return.
 */

export type NetworkGuardResult = {
  ok: boolean;
  title: string;
  description: string;
};

const PROBE_TIMEOUT_MS = 5000;

export async function preflightNetwork(): Promise<NetworkGuardResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      title: "No internet connection",
      description:
        "You appear to be offline. Your questions are safe — reconnect and press the button again. Do NOT reload the page.",
    };
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url) return { ok: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: key ? { apikey: key } : undefined,
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      title: "Network unstable",
      description:
        "Could not reach the server. Your questions are safe — check your connection and press the button again. Do NOT reload the page.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms = 30000): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out — please retry")), ms)
    ),
  ]);
}
