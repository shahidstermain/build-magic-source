import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny inline SVG placeholder used when every URL in the chain fails.
 * Keeps the layout intact so cards never collapse or show a broken-image icon.
 */
const FALLBACK_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#e0f2fe"/>
           <stop offset="1" stop-color="#bae6fd"/>
         </linearGradient>
       </defs>
       <rect width="800" height="450" fill="url(#g)"/>
       <text x="50%" y="50%" font-family="system-ui,sans-serif" font-size="22"
             fill="#0c4a6e" text-anchor="middle" dominant-baseline="middle">
         Andaman Islands
       </text>
     </svg>`,
  );

type Fit = "cover" | "contain" | "scale-down";

export interface SmartImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> {
  /** Primary image URL. */
  src: string;
  /** Optional ordered fallbacks if the primary (and any earlier ones) fail. */
  fallbacks?: string[];
  /** How the image should fit its container. Default: cover. */
  fit?: Fit;
  /** sizes attribute. Default tuned for full-bleed / card images. */
  sizes?: string;
  /** When true (default), generates an Unsplash-aware `srcSet` for the primary URL. */
  responsive?: boolean;
  /** When true (default), shows a shimmering skeleton until the image is decoded. */
  showSkeleton?: boolean;
  /** Optional className applied to the wrapping element. */
  wrapperClassName?: string;
}

/** Build a responsive srcSet for Unsplash URLs. Returns undefined for non-Unsplash. */
function buildUnsplashSrcSet(url: string): string | undefined {
  if (!/images\.unsplash\.com\/photo-/.test(url)) return undefined;
  const widths = [480, 768, 1200, 1600];
  return widths
    .map((w) => {
      const u = new URL(url);
      u.searchParams.set("w", String(w));
      u.searchParams.set("auto", u.searchParams.get("auto") ?? "format");
      u.searchParams.set("fit", u.searchParams.get("fit") ?? "crop");
      u.searchParams.set("q", u.searchParams.get("q") ?? "70");
      return `${u.toString()} ${w}w`;
    })
    .join(", ");
}

/**
 * Image component with a graceful fallback chain, an inline SVG safety net,
 * an Unsplash-aware `srcSet`, and a shimmering skeleton + fade-in transition
 * so layouts feel polished while images load.
 */
export function SmartImage({
  src,
  fallbacks = [],
  fit = "cover",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  responsive = true,
  showSkeleton = true,
  wrapperClassName,
  className,
  alt = "",
  loading = "lazy",
  decoding = "async",
  ...rest
}: SmartImageProps) {
  const chain = [src, ...fallbacks, FALLBACK_SVG];
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reset state whenever the caller swaps the primary source.
  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [src]);

  const currentSrc = chain[index];
  const isFallbackSvg = currentSrc === FALLBACK_SVG;
  const srcSet = !isFallbackSvg && responsive ? buildUnsplashSrcSet(currentSrc) : undefined;

  return (
    <span
      className={cn(
        "relative block h-full w-full overflow-hidden bg-muted",
        wrapperClassName,
      )}
    >
      {showSkeleton && !loaded && (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted"
        />
      )}
      <img
        {...rest}
        src={currentSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (index < chain.length - 1) {
            setIndex((i) => i + 1);
          } else {
            setLoaded(true);
          }
        }}
        className={cn(
          "h-full w-full transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          fit === "cover" && "object-cover",
          fit === "contain" && "object-contain",
          fit === "scale-down" && "object-scale-down",
          className,
        )}
      />
    </span>
  );
}

export default SmartImage;