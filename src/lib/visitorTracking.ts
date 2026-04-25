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

  try {
    await supabase.rpc("record_visitor", {
      _session_id: session_id,
      _path: path,
      _referer: referer,
      _user_agent: user_agent,
    });
  } catch {
    // best-effort; ignore failures
  }
}