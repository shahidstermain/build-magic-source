import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Compact pill for listing cards. Defaults to true. */
  compact?: boolean;
};

/**
 * Small "Verified local" badge shown on listing cards when the seller's
 * location has been verified by an admin.
 */
export function VerifiedLocalBadge({ className, compact = true }: Props) {
  return (
    <span
      title="Seller's island location verified"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/15 font-medium text-success ring-1 ring-success/30",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <ShieldCheck className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Verified local
    </span>
  );
}
