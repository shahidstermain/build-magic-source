import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Compass,
  Mountain,
  Palmtree,
  Ship,
  Waves,
  type LucideProps,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectorOption = {
  title: string;
  description: string;
  image: string;
  icon: ComponentType<LucideProps>;
  href?: string;
};

export interface InteractiveSelectorProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  options?: SelectorOption[];
  className?: string;
}

const defaultOptions: SelectorOption[] = [
  {
    title: "Havelock (Swaraj Dweep)",
    description: "White-sand beaches, scuba & sunsets at Radhanagar.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=70",
    icon: Palmtree,
    href: "/listings?city=havelock",
  },
  {
    title: "Neil Island (Shaheed Dweep)",
    description: "Slow mornings, coral reefs & cycle rides.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70",
    icon: Waves,
    href: "/listings?city=neil-island",
  },
  {
    title: "Port Blair",
    description: "Cellular Jail, harbour & the gateway to every ferry.",
    image:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=70",
    icon: Anchor,
    href: "/listings?city=port-blair",
  },
  {
    title: "Diglipur",
    description: "Twin islands, mud volcanoes & turtle nesting.",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=70",
    icon: Mountain,
    href: "/listings?city=diglipur",
  },
  {
    title: "Baratang",
    description: "Limestone caves & dawn mangrove cruises.",
    image:
      "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=70",
    icon: Ship,
    href: "/listings?city=baratang",
  },
];

export default function InteractiveSelector({
  eyebrow = "Explore the islands",
  title = "Pick your slice of the Andamans",
  subtitle = "From scuba in Havelock to mangrove cruises in Baratang — tap a panel to see what each island brings.",
  options = defaultOptions,
  className,
}: InteractiveSelectorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    options.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setRevealed((prev) => (prev.includes(i) ? prev : [...prev, i]));
        }, 120 * i),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [options]);

  return (
    <section className={cn("w-full", className)}>
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-primary" />
          {eyebrow}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        )}
      </div>

      <div className="flex h-[420px] w-full flex-col gap-2 sm:flex-row sm:gap-3">
        {options.map((option, index) => {
          const isActive = index === activeIndex;
          const isRevealed = revealed.includes(index);
          const Icon = option.icon;

          const className = cn(
                "group relative block min-w-[60px] cursor-pointer overflow-hidden rounded-2xl border border-border text-left transition-[flex-grow,transform,box-shadow] duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "flex-[5] shadow-lg sm:flex-[6]"
                  : "flex-[1] hover:flex-[1.2]",
                isRevealed
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-6 opacity-0",
          );
          const style = { transitionDelay: isRevealed ? "0ms" : `${index * 80}ms` };
          const handlers = {
            onMouseEnter: () => setActiveIndex(index),
            onFocus: () => setActiveIndex(index),
            onClick: () => setActiveIndex(index),
          };

          const inner = (
            <>
              {/* Background image */}
              <img
                src={option.image}
                alt={option.title}
                loading="lazy"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-transform duration-700",
                  isActive ? "scale-105" : "scale-100 group-hover:scale-105",
                )}
              />

              {/* Gradient veil */}
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  isActive
                    ? "bg-gradient-to-t from-background/85 via-background/20 to-transparent opacity-100"
                    : "bg-background/55 opacity-100 group-hover:bg-background/35",
                )}
              />

              {/* Label */}
              <div className="absolute inset-x-3 bottom-3 flex items-end gap-3">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 bg-background/70 text-foreground backdrop-blur transition-colors",
                    isActive && "border-primary/40 bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div
                  className={cn(
                    "min-w-0 flex-1 transition-all duration-500",
                    isActive
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0 sm:translate-y-2",
                  )}
                >
                  <p className="truncate text-base font-semibold text-foreground drop-shadow-sm">
                    {option.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {option.description}
                  </p>
                </div>
              </div>

              {/* Vertical label when collapsed (desktop only) */}
              {!isActive && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-foreground/90 drop-shadow-sm sm:block">
                  {option.title.split(" ")[0]}
                </span>
              )}
            </>
          );

          if (option.href) {
            return (
              <Link
                key={option.title}
                to={option.href}
                aria-label={option.title}
                className={className}
                style={style}
                {...handlers}
              >
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={option.title}
              type="button"
              aria-label={option.title}
              className={className}
              style={style}
              {...handlers}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}