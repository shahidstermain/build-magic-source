import { Link2, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Author = {
  name: string;
  photoUrl?: string;
  designation: string;
  location?: string;
  about: string;
  website?: string;
  websiteLabel?: string;
};

export const AUTHOR_SHAHID: Author = {
  name: "Shahid Moosa",
  photoUrl:
    "https://lh3.googleusercontent.com/a/ACg8ocLMb6w6hv_YoUMaUg1SzknnFhyzjOMUhcJhOXI3ZFVrEh1TEGi4gg=s256-c",
  designation: "Database Support Engineer @ SingleStore · Founder, AndamanBazaar",
  location: "Port Blair, Andaman & Nicobar Islands",
  about:
    "Born and raised in the Andamans, I write practical, local-first travel guides so visitors can plan trips without the usual confusion. By day I work on cloud databases and information security; by weekend I'm probably on a ferry or at a beach café.",
  website: "https://www.shhahidster.tech/",
  websiteLabel: "shhahidster.tech",
};

export function AuthorByline({
  author,
  variant = "compact",
  className,
}: {
  author: Author;
  variant?: "compact" | "card";
  className?: string;
}) {
  const initials = author.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Avatar className="h-7 w-7 border border-border">
          <AvatarImage src={author.photoUrl} alt={author.name} />
          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span>
          By <span className="font-medium text-foreground">{author.name}</span>
        </span>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5",
        className,
      )}
    >
      <Avatar className="h-14 w-14 shrink-0 border border-border">
        <AvatarImage src={author.photoUrl} alt={author.name} />
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1.5">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-tight">{author.name}</p>
          <p className="text-xs text-muted-foreground">{author.designation}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">{author.about}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
          {author.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {author.location}
            </span>
          )}
          {author.website && (
            <a
              href={author.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Link2 className="h-3 w-3" /> {author.websiteLabel ?? author.website}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}