/**
 * Shared fetchWithTimeout utility.
 * Used by opensky.js, ais-snapshot.js, polymarket-intel.js, rss-proxy.js.
 */
export async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
