export const LEGAL_VERSIONS = {
  terms: "2025-04-25",
  privacy: "2025-04-25",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const LEGAL_LABELS: Record<LegalDocumentType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};