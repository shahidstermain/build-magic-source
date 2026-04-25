import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SITE_SETTINGS,
  SiteSettings,
  fetchSiteSettings,
} from "@/lib/siteSettings";

type Ctx = {
  settings: SiteSettings;
  refresh: () => Promise<void>;
  setLocal: (s: SiteSettings) => void;
};

const SiteMetaContext = createContext<Ctx>({
  settings: DEFAULT_SITE_SETTINGS,
  refresh: async () => {},
  setLocal: () => {},
});

function setMetaTag(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOgTag(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SiteMetaProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const refresh = useCallback(async () => {
    const s = await fetchSiteSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("site_settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    document.title = settings.site_title;
    setMetaTag("description", settings.site_description);
    setOgTag("og:title", settings.site_title);
    setOgTag("og:description", settings.site_description);
  }, [settings]);

  return (
    <SiteMetaContext.Provider value={{ settings, refresh, setLocal: setSettings }}>
      {children}
    </SiteMetaContext.Provider>
  );
}

export function useSiteMeta() {
  return useContext(SiteMetaContext);
}
