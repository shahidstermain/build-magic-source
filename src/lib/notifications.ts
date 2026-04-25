/**
 * Lightweight browser notification helper.
 *
 * No service worker yet — we fire a foreground `Notification` when the tab is
 * not focused. This unlocks the native push UI without backend infra. A real
 * web-push (VAPID + service worker) layer can be added on top later.
 */

export type WebNotificationPermission = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): WebNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as WebNotificationPermission;
}

export async function requestNotificationPermission(): Promise<WebNotificationPermission> {
  const cur = getNotificationPermission();
  if (cur === "unsupported" || cur === "granted" || cur === "denied") return cur;
  const result = await Notification.requestPermission();
  return result as WebNotificationPermission;
}

/**
 * Show a native notification if the tab is hidden and we have permission.
 * No-op otherwise — the in-app bell handles the focused case.
 */
export function maybeShowSystemNotification(opts: {
  title: string;
  body?: string;
  link?: string;
  tag?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: "/favicon.ico",
    });
    n.onclick = () => {
      window.focus();
      if (opts.link) window.location.href = opts.link;
      n.close();
    };
  } catch {
    // Some browsers throw if called outside a user gesture — ignore.
  }
}