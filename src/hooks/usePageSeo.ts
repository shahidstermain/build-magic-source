import { useEffect } from "react";

const SITE_NAME = "AndamanBazaar";
const BASE_URL = "https://andamanbazaar.in";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

export interface PageSeoProps {
  title: string;
  description: string;
  /** Canonical path, e.g. "/listings" or "/listings/abc-123" */
  path?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  /** JSON-LD structured data object(s) */
  jsonLd?: object | object[];
  /** Set to true for auth/admin/private pages */
  noIndex?: boolean;
}

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOg(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: object | object[]) {
  // Remove existing script with this id
  document.getElementById(`jsonld-${id}`)?.remove();
  const script = document.createElement("script");
  script.id = `jsonld-${id}`;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(Array.isArray(data) ? data : data);
  document.head.appendChild(script);
}

export function usePageSeo({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
  noIndex = false,
}: PageSeoProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    const canonical = path ? `${BASE_URL}${path}` : BASE_URL;

    // Title
    document.title = fullTitle;

    // Standard meta
    setMeta("description", description);
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");

    // Canonical
    setCanonical(canonical);

    // Open Graph
    setOg("og:title", fullTitle);
    setOg("og:description", description);
    setOg("og:url", canonical);
    setOg("og:image", ogImage);
    setOg("og:type", ogType);

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);

    // JSON-LD
    if (jsonLd) {
      setJsonLd("page", jsonLd);
    }

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = `${SITE_NAME} — Buy, Sell & Discover Across the Islands`;
      setMeta("robots", "index, follow");
      setCanonical(BASE_URL);
      document.getElementById("jsonld-page")?.remove();
    };
  }, [title, description, path, ogImage, ogType, noIndex, jsonLd]);
}
