import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type HeroPrompt = { label: string; value?: string };

export interface Hero1Props {
  eyebrow?: string;
  title?: React.ReactNode;
  subtitle?: string;
  placeholder?: string;
  initialValue?: string;
  prompts?: HeroPrompt[];
  activePromptLabels?: string[];
  ctaLabel?: string;
  onSubmit?: (value: string) => void;
  onPromptSelect?: (prompt: HeroPrompt) => void;
  className?: string;
}

const Hero1 = ({
  eyebrow = "AI-powered",
  title = (
    <>
      Build your <span className="text-primary">Andaman trip</span> in a sentence.
    </>
  ),
  subtitle = "Tell us your dream Andaman trip — we'll handle ferries, timings, and bookings.",
  placeholder = "e.g. 5 days in Havelock & Neil with scuba and a quiet beach stay…",
  initialValue = "",
  prompts = [],
  activePromptLabels = [],
  ctaLabel = "Plan it",
  onSubmit,
  onPromptSelect,
  className,
}: Hero1Props) => {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value.trim());
  };

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border bg-background px-5 py-12 sm:px-10 sm:py-16",
        className,
      )}
    >
      {/* Decorative gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.15),transparent_55%)]"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {eyebrow}
        </div>

        <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">{subtitle}</p>

        {/* Prompt input */}
        <form
          onSubmit={handleSubmit}
          className="group mt-7 flex w-full max-w-2xl items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm transition-shadow focus-within:shadow-md"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Wand2 className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
          />
          <Button type="submit" size="sm" className="shrink-0 rounded-full">
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>

        {/* Suggestion pills */}
        {prompts.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {prompts.map((p) => {
              const active = activePromptLabels.includes(p.label);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setValue(p.value ?? p.label);
                    onPromptSelect?.(p);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export { Hero1 };
export default Hero1;