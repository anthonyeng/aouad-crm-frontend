// src/lib/fbpixel.js
// Thin wrapper around the Meta Pixel (fbq), which is loaded by the base code
// in index.html. Every call is guarded so it is a safe no-op when the pixel
// script hasn't loaded yet or is blocked by an ad blocker.

function hasPixel() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/** Fire a standard/custom Meta Pixel event, e.g. fbTrack("Lead", { content_name: "Contact" }). */
export function fbTrack(event, params) {
  if (!hasPixel()) return;
  try {
    if (params) window.fbq("track", event, params);
    else window.fbq("track", event);
  } catch {
    /* no-op */
  }
}

/** Fire a PageView. The base code fires the first one on initial load; use this for SPA route changes. */
export function fbPageView() {
  fbTrack("PageView");
}
