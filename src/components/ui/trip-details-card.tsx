import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusBadgeVariants = cva("capitalize border-transparent", {
  variants: {
    status: {
      upcoming: "bg-primary/10 text-primary hover:bg-primary/15",
      completed: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      cancelled: "bg-destructive/10 text-destructive hover:bg-destructive/15",
    },
  },
  defaultVariants: { status: "upcoming" },
});

export interface TripAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
  className?: string;
}

export interface TripDetailsCardProps
  extends VariantProps<typeof statusBadgeVariants> {
  origin: string;
  destination: string;
  travelerName: string;
  tripId: string;
  travelDate: Date;
  actions: TripAction[];
  status: "upcoming" | "completed" | "cancelled";
  className?: string;
}

const TripDetailsCard = React.forwardRef<HTMLDivElement, TripDetailsCardProps>(
  (
    { className, origin, destination, travelerName, status, tripId, travelDate, actions },
    ref,
  ) => {
    const formattedDate = travelDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
    };

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm",
          className,
        )}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <span className="truncate">{origin}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{destination}</span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {travelerName} is travelling
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={cn(statusBadgeVariants({ status }))}>{status}</Badge>
              <span className="text-xs text-muted-foreground">Trip ID: {tripId}</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {origin} → {destination}
            </p>
            <p className="mt-1 text-sm font-medium">{formattedDate}</p>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="border-t border-border bg-muted/20 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant ?? "ghost"}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn("h-8", action.className)}
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    );
  },
);

TripDetailsCard.displayName = "TripDetailsCard";

export { TripDetailsCard };