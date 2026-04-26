import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { CheckCheck, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type PricingPlan = {
  name: string;
  description: string;
  price: number;
  yearlyPrice?: number;
  priceSuffix?: string;
  yearlySuffix?: string;
  ctaLabel: string;
  ctaHref: string;
  popular?: boolean;
  icon?: LucideIcon;
  features: { text: string; icon?: LucideIcon }[];
  includes: string[];
  oldPrice?: number;
  oldYearlyPrice?: number;
};

export interface PricingSectionProps {
  title?: React.ReactNode;
  subtitle?: string;
  plans: PricingPlan[];
  showToggle?: boolean;
  className?: string;
}

function PricingSwitch({ value, onChange }: { value: "monthly" | "yearly"; onChange: (v: "monthly" | "yearly") => void }) {
  return (
    <div className="mx-auto inline-flex items-center rounded-full border border-border bg-muted p-1">
      {(["monthly", "yearly"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "relative z-10 rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-colors",
            value === opt ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === opt && (
            <motion.span
              layoutId="pricing-switch-pill"
              className="absolute inset-0 -z-10 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          {opt === "yearly" ? (
            <span className="flex items-center gap-1.5">
              Yearly
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Save 20%
              </span>
            </span>
          ) : (
            "Monthly"
          )}
        </button>
      ))}
    </div>
  );
}

export default function PricingSection({
  title,
  subtitle,
  plans,
  showToggle = false,
  className,
}: PricingSectionProps) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const isYearly = period === "yearly";
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative mx-auto w-full max-w-6xl overflow-hidden px-4 py-16 sm:py-20",
        className,
      )}
    >
      {/* Decorative gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]"
      />
      <motion.div
        initial={{ opacity: 0, y: -10, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-2xl text-center"
      >
        <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Transparent pricing
        </div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title ?? <>Simple pricing that <span className="text-primary">grows with you</span></>}
        </h2>
        {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
      </motion.div>

      {showToggle && (
        <div className="mt-8 flex justify-center">
          <PricingSwitch value={period} onChange={setPeriod} />
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const showYearly = isYearly && plan.yearlyPrice !== undefined;
          const displayPrice = showYearly ? (plan.yearlyPrice as number) : plan.price;
          const displayOld = showYearly ? plan.oldYearlyPrice : plan.oldPrice;
          const suffix = showYearly ? plan.yearlySuffix ?? "/year" : plan.priceSuffix ?? "/month";
          const Icon = plan.icon;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.15, ease: "easeOut" }}
              className={plan.popular ? "lg:-mt-4" : ""}
            >
              <Card
                className={cn(
                  "relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                  plan.popular &&
                    "border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-lg ring-1 ring-primary/30",
                )}
              >
                {plan.popular && (
                  <div className="absolute right-4 top-4 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-sm">
                      <Sparkles className="mr-1 h-3 w-3" /> Most popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    {Icon && (
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg",
                          plan.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="flex items-baseline gap-2 pt-3">
                    <span className="text-5xl font-bold tracking-tight">
                      ₹<NumberFlow value={displayPrice} />
                    </span>
                    <span className="text-sm text-muted-foreground">{suffix}</span>
                  </div>
                  {displayOld !== undefined && displayOld > displayPrice && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground line-through">
                        ₹{displayOld.toLocaleString("en-IN")}
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        {Math.round(((displayOld - displayPrice) / displayOld) * 100)}% off
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-5">
                  <Button
                    asChild
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    className="w-full"
                  >
                    <Link to={plan.ctaHref}>{plan.ctaLabel}</Link>
                  </Button>

                  {plan.features.length > 0 && (
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, i) => {
                        const FIcon = feature.icon ?? CheckCheck;
                        return (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <FIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{feature.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {plan.includes.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {plan.includes[0]}
                      </p>
                      <ul className="space-y-2">
                        {plan.includes.slice(1).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export { PricingSwitch };