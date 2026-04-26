export const LEGAL_VERSIONS = {
  terms: "2025-04-25",
  privacy: "2025-04-25",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const LEGAL_LABELS: Record<LegalDocumentType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

import { supabase } from "@/integrations/supabase/client";

/**
 * Record acceptance of the current legal versions for the given user, but only
 * for documents whose current version isn't already on file. Safe to call on
 * every successful auth — it short-circuits when nothing is missing.
 */
export async function recordLegalAcceptanceIfMissing(userId: string, context = "auth") {
  const types = Object.keys(LEGAL_VERSIONS) as LegalDocumentType[];

  const { data: existing } = await supabase
    .from("legal_acceptances")
    .select("document_type, version")
    .eq("user_id", userId)
    .in("document_type", types);

  const have = new Set((existing ?? []).map((r) => `${r.document_type}:${r.version}`));

  const missing = types
    .filter((t) => !have.has(`${t}:${LEGAL_VERSIONS[t]}`))
    .map((t) => ({
      user_id: userId,
      document_type: t,
      version: LEGAL_VERSIONS[t],
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      context,
    }));

  if (missing.length === 0) return;
  await supabase.from("legal_acceptances").insert(missing);
}