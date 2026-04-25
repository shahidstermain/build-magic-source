import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_title: string;
  site_description: string;
  github_repo_url: string | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: "AndamanBazaar — Island marketplace, boat pe bharosa",
  site_description:
    "AndamanBazaar is the hyperlocal marketplace for the Andaman Islands — buy, sell, and chat with trusted local sellers across Port Blair, Havelock, and Neil.",
  github_repo_url: null,
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("site_title, site_description, github_repo_url")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_SITE_SETTINGS;
  return {
    site_title: data.site_title ?? DEFAULT_SITE_SETTINGS.site_title,
    site_description: data.site_description ?? DEFAULT_SITE_SETTINGS.site_description,
    github_repo_url: (data as { github_repo_url?: string | null }).github_repo_url ?? null,
  };
}

export async function updateSiteSettings(
  patch: Partial<SiteSettings>,
  userId?: string,
): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .update({ ...patch, updated_by: userId ?? null })
    .eq("id", true)
    .select("site_title, site_description, github_repo_url")
    .single();
  if (error) throw error;
  return {
    site_title: data.site_title,
    site_description: data.site_description,
    github_repo_url: (data as { github_repo_url?: string | null }).github_repo_url ?? null,
  };
}
