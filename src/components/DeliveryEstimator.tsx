import { useMemo, useState } from "react";
import { Ship, Truck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ANDAMAN_AREAS, formatPrice } from "@/lib/listings";
import {
  estimateDelivery,
  PACKAGE_SIZES,
  type PackageSize,
} from "@/lib/logistics";

type Props = {
  fromArea: string;
  defaultSize?: PackageSize;
};

export function DeliveryEstimator({ fromArea, defaultSize = "small" }: Props) {
  const [toArea, setToArea] = useState<string>(fromArea);
  const [size, setSize] = useState<PackageSize>(defaultSize);

  const estimate = useMemo(
    () => estimateDelivery({ fromArea, toArea, size }),
    [fromArea, toArea, size],
  );

  const etaLabel =
    estimate.etaMinDays === estimate.etaMaxDays
      ? `${estimate.etaMaxDays} day${estimate.etaMaxDays === 1 ? "" : "s"}`
      : `${estimate.etaMinDays}–${estimate.etaMaxDays} days`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {estimate.ferryRequired ? (
          <Ship className="h-4 w-4 text-primary" />
        ) : (
          <Truck className="h-4 w-4 text-primary" />
        )}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Delivery estimate
        </h2>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deliver-to" className="text-xs">Deliver to</Label>
          <Select value={toArea} onValueChange={setToArea}>
            <SelectTrigger id="deliver-to">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANDAMAN_AREAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pkg-size" className="text-xs">Package size</Label>
          <Select value={size} onValueChange={(v) => setSize(v as PackageSize)}>
            <SelectTrigger id="pkg-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PACKAGE_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label} <span className="text-muted-foreground">· {s.hint}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Est. cost</p>
          <p className="mt-0.5 text-lg font-semibold">{formatPrice(estimate.costInr)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Est. ETA</p>
          <p className="mt-0.5 text-lg font-semibold">{etaLabel}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {estimate.hops === 0
            ? "No ferry needed"
            : `${estimate.hops} ferry hop${estimate.hops === 1 ? "" : "s"}`}
        </Badge>
        <span className="text-xs text-muted-foreground">From {fromArea}</span>
      </div>

      {estimate.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {estimate.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Estimate only — actual cost &amp; ETA depend on ferry schedules and weather.
      </p>
    </div>
  );
}