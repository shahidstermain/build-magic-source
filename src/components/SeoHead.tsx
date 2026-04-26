import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description?: string | null;
  image?: string | null;
  url?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown>;
};

export function SeoHead({ title, description, image, url, type = "website", jsonLd }: Props) {
  const fullUrl = url ?? (typeof window !== "undefined" ? window.location.href : undefined);
  const desc = description ?? "";
  return (
    <Helmet>
      <title>{title}</title>
      {desc && <meta name="description" content={desc} />}
      {fullUrl && <link rel="canonical" href={fullUrl} />}
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:type" content={type} />
      {fullUrl && <meta property="og:url" content={fullUrl} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}