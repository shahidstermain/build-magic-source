import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_title: string;
  site_description: string;
  github_repo_url: string | null;
  visitor_alerts_enabled: boolean;
  visitor_alerts_in_app: boolean;
  visitor_alerts_email_enabled: boolean;
  visitor_alert_email: string | null;
  visitor_alerts_webhook_enabled: boolean;
  visitor_alert_webhook_url: string | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: "AndamanBazaar — Island marketplace, boat pe bharosa",
  site_description:
    "AndamanBazaar is the hyperlocal marketplace for the Andaman Islands — buy, sell, and chat with trusted local sellers across Port Blair, Havelock, and Neil.",
  github_repo_url: null,
  visitor_alerts_enabled: true,
  visitor_alerts_in_app: true,
  visitor_alerts_email_enabled: false,
  visitor_alert_email: null,
  visitor_alerts_webhook_enabled: false,
  visitor_alert_webhook_url: null,
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_SITE_SETTINGS;
  const d = data as Record<string, unknown>;
  return {
    site_title: (d.site_title as string) ?? DEFAULT_SITE_SETTINGS.site_title,
    site_description: (d.site_description as string) ?? DEFAULT_SITE_SETTINGS.site_description,
    github_repo_url: (d.github_repo_url as string | null) ?? null,
    visitor_alerts_enabled: (d.visitor_alerts_enabled as boolean) ?? true,
    visitor_alerts_in_app: (d.visitor_alerts_in_app as boolean) ?? true,
    visitor_alerts_email_enabled: (d.visitor_alerts_email_enabled as boolean) ?? false,
    visitor_alert_email: (d.visitor_alert_email as string | null) ?? null,
    visitor_alerts_webhook_enabled: (d.visitor_alerts_webhook_enabled as boolean) ?? false,
    visitor_alert_webhook_url: (d.visitor_alert_webhook_url as string | null) ?? null,
  };
}

export async function updateSiteSettings(
  patch: Partial<SiteSettings>,
  userId?: string,
): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .update({ ...patch, updated_by: userId ?? null } as never)
    .eq("id", true)
    .select("*")
    .single();
  if (error) throw error;
  const d = data as Record<string, unknown>;
  return {
    site_title: d.site_title as string,
    site_description: d.site_description as string,
    github_repo_url: (d.github_repo_url as string | null) ?? null,
    visitor_alerts_enabled: (d.visitor_alerts_enabled as boolean) ?? true,
    visitor_alerts_in_app: (d.visitor_alerts_in_app as boolean) ?? true,
    visitor_alerts_email_enabled: (d.visitor_alerts_email_enabled as boolean) ?? false,
    visitor_alert_email: (d.visitor_alert_email as string | null) ?? null,
    visitor_alerts_webhook_enabled: (d.visitor_alerts_webhook_enabled as boolean) ?? false,
    visitor_alert_webhook_url: (d.visitor_alert_webhook_url as string | null) ?? null,
  };
}
