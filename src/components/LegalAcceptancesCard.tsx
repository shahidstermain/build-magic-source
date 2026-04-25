import { useEffect, useState } from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { LEGAL_LABELS, LEGAL_VERSIONS, type LegalDocumentType } from "@/lib/legal";

type Acceptance = {
  id: string;
  document_type: LegalDocumentType;
  version: string;
  accepted_at: string;
  context: string | null;
};

export function LegalAcceptancesCard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("legal_acceptances")
        .select("id, document_type, version, accepted_at, context")
        .eq("user_id", userId)
        .order("accepted_at", { ascending: false });
      if (!cancelled) {
        setRows((data ?? []) as Acceptance[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Latest acceptance per document type
  const latest: Partial<Record<LegalDocumentType, Acceptance>> = {};
  for (const row of rows) {
    if (!latest[row.document_type]) latest[row.document_type] = row;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Legal acceptances</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <ul className="space-y-3">
          {(Object.keys(LEGAL_LABELS) as LegalDocumentType[]).map((type) => {
            const row = latest[type];
            const currentVersion = LEGAL_VERSIONS[type];
            const upToDate = row?.version === currentVersion;
            return (
              <li
                key={type}
                className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{LEGAL_LABELS[type]}</p>
                  {row ? (
                    <p className="text-xs text-muted-foreground">
                      Accepted v{row.version} ·{" "}
                      {new Date(row.accepted_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No record found.</p>
                  )}
                </div>
                {row ? (
                  upToDate ? (
                    <Badge className="bg-success text-success-foreground">Up to date</Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning text-warning">
                      Update available (v{currentVersion})
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">Not recorded</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
        We keep an immutable record of which version of our legal documents you accepted, so you always know
        what you agreed to.
      </p>
    </div>
  );
}