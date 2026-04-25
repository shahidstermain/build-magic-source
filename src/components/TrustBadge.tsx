import { Award, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { computeTrust, type TrustInput, type TrustLevel } from "@/lib/trust";

const ICONS: Record<TrustLevel, React.ComponentType<{ className?: string }>> = {
  newbie: UserPlus,
  trusted: Sparkles,
  verified: ShieldCheck,
  legend: Award,
};

const STYLES: Record<TrustLevel, string> = {
  newbie: "bg-muted text-muted-foreground",
  trusted: "bg-secondary text-secondary-foreground",
  verified: "bg-success text-success-foreground",
  legend: "bg-accent text-accent-foreground",
};

type Props = {
  profile: TrustInput;
  size?: "sm" | "md";
  className?: string;
};

export function TrustBadge({ profile, size = "md", className }: Props) {
  const meta = computeTrust(profile);
  const Icon = ICONS[meta.level];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={cn(
            STYLES[meta.level],
            size === "sm" ? "px-2 py-0 text-[10px]" : "",
            "cursor-default",
            className,
          )}
        >
          <Icon className={cn("mr-1", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
          {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-xs">{meta.description}</TooltipContent>
    </Tooltip>
  );
}