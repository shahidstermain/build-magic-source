/**
 * Hyperlocal logistics estimator for the Andaman & Nicobar Islands.
 *
 * The model is intentionally simple and conservative — it gives buyers a
 * realistic delivery cost & ETA range so they aren't surprised by ferry
 * schedules. All values are tunable from one place.
 */

import { ANDAMAN_AREAS } from "@/lib/listings";

export type IslandArea = (typeof ANDAMAN_AREAS)[number];

/**
 * Approximate "ferry hops" between hubs. Higher = more transfers required.
 * Port Blair is the central hub.
 */
const FERRY_HOPS: Record<string, Record<string, number>> = {
  "Port Blair": {
    "Port Blair": 0,
    "Havelock (Swaraj Dweep)": 1,
    "Neil (Shaheed Dweep)": 1,
    Diglipur: 2,
    Rangat: 1,
    Mayabunder: 2,
    "Hut Bay": 1,
    "Car Nicobar": 2,
  },
};

/** Mirror to make the matrix symmetric & default same-area to 0 hops. */
function ferryHops(from: string, to: string): number {
  if (from === to) return 0;
  if (FERRY_HOPS[from]?.[to] != null) return FERRY_HOPS[from][to];
  if (FERRY_HOPS[to]?.[from] != null) return FERRY_HOPS[to][from];
  // Unknown pair — assume one ferry hop
  return 1;
}

export type PackageSize = "small" | "medium" | "large";

const SIZE_MULTIPLIER: Record<PackageSize, number> = {
  small: 1, // ≤ 2 kg, fits in a backpack
  medium: 1.6, // ≤ 10 kg, suitcase-sized
  large: 2.4, // > 10 kg, needs handling
};

/** Base cost in INR before ferry surcharges. */
const BASE_COST_INR = 80;
/** Per-hop ferry surcharge in INR. */
const FERRY_SURCHARGE_INR = 120;
/** Each additional hop adds this many days to the lower bound of the ETA. */
const DAYS_PER_HOP_MIN = 1;
const DAYS_PER_HOP_MAX = 2;

export type DeliveryEstimate = {
  hops: number;
  costInr: number;
  etaMinDays: number;
  etaMaxDays: number;
  ferryRequired: boolean;
  notes: string[];
};

export function estimateDelivery(input: {
  fromArea: string;
  toArea: string;
  size?: PackageSize;
}): DeliveryEstimate {
  const size = input.size ?? "small";
  const hops = ferryHops(input.fromArea, input.toArea);
  const sizeMult = SIZE_MULTIPLIER[size];

  const costInr = Math.round(
    (BASE_COST_INR + hops * FERRY_SURCHARGE_INR) * sizeMult,
  );

  const etaMinDays = hops === 0 ? 0 : hops * DAYS_PER_HOP_MIN;
  const etaMaxDays = hops === 0 ? 1 : hops * DAYS_PER_HOP_MAX + 1;

  const notes: string[] = [];
  if (hops === 0) {
    notes.push("Same area — usually delivered the same day.");
  } else {
    notes.push(
      `Requires ${hops} ferry ${hops === 1 ? "hop" : "hops"}. Weather can delay sailings.`,
    );
  }
  if (size !== "small") {
    notes.push("Larger items may need scheduled cargo space on the ferry.");
  }

  return {
    hops,
    costInr,
    etaMinDays,
    etaMaxDays,
    ferryRequired: hops > 0,
    notes,
  };
}

export const PACKAGE_SIZES: { value: PackageSize; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "≤ 2 kg" },
  { value: "medium", label: "Medium", hint: "≤ 10 kg" },
  { value: "large", label: "Large", hint: "> 10 kg" },
];