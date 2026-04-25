import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "ab_session_id";
const FLAG_KEY = "ab_session_recorded";

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Records a visitor event ONCE per browser session (per tab lifetime).
 * Calls a SECURITY DEFINER RPC that also notifies all admins.
 */
export async function recordVisitorOnce() {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(FLAG_KEY) === "1") return;
    sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    return;
  }

  const session_id = getOrCreateSessionId();
  const path = window.location.pathname || "/";
  const referer = document.referrer || "";
  const user_agent = navigator.userAgent || "";
  const landing_url = window.location.href || "";
  const language = navigator.language || "";
  const screen_size =
    typeof window.screen?.width === "number"
      ? `${window.screen.width}x${window.screen.height}`
      : "";
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  try {
    const { data: recorded } = await supabase.rpc("record_visitor", {
      _session_id: session_id,
      _path: path,
      _referer: referer,
      _user_agent: user_agent,
    });

    // Only dispatch external alerts when this is a new session (RPC returned true).
    if (recorded === true) {
      try {
        await supabase.functions.invoke("visitor-alert", {
          body: {
            session_id,
            path,
            referer,
            user_agent,
            landing_url,
            language,
            screen_size,
            timezone,
          },
        });
      } catch {
        // best-effort
      }
    }
  } catch {
    // best-effort; ignore failures
  }
}