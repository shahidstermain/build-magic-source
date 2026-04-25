export type TrustLevel = "newbie" | "trusted" | "verified" | "legend";

export type TrustInput = {
  is_location_verified?: boolean | null;
  total_listings?: number | null;
  successful_sales?: number | null;
};

export type TrustMeta = {
  level: TrustLevel;
  label: string;
  description: string;
};

const META: Record<TrustLevel, Omit<TrustMeta, "level">> = {
  newbie: {
    label: "Newbie",
    description: "Naya seller — boat pe bharosa rakho, but pehle confirm karo.",
  },
  trusted: {
    label: "Trusted",
    description: "Active seller with a track record on the islands.",
  },
  verified: {
    label: "Island Verified",
    description: "Location verified by GPS — local pakka.",
  },
  legend: {
    label: "Island Legend",
    description: "Verified + lots of successful sales. Top of the bazaar.",
  },
};

export function computeTrust(input: TrustInput): TrustMeta {
  const verified = !!input.is_location_verified;
  const sales = input.successful_sales ?? 0;
  const listings = input.total_listings ?? 0;

  let level: TrustLevel = "newbie";
  if (verified && sales >= 10) level = "legend";
  else if (verified) level = "verified";
  else if (sales >= 3 || listings >= 5) level = "trusted";

  return { level, ...META[level] };
}