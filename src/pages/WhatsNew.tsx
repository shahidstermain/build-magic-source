import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ReleaseNote = {
  id: string;
  version: string | null;
  title: string;
  summary: string | null;
  highlights: unknown;
  published_at: string | null;
};

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

export default function WhatsNew() {
  const [items, setItems] = useState<ReleaseNote[] | null>(null);

  useEffect(() => {
    document.title = "What's new — AndamanBazaar";
    (async () => {
      const { data } = await supabase
        .from("release_notes")
        .select("id, version, title, summary, highlights, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(50);
      setItems((data ?? []) as ReleaseNote[]);
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">What's new</h1>
          <p className="text-sm text-muted-foreground">
            Recent updates and improvements to AndamanBazaar.
          </p>
        </div>
      </header>

      {items === null ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No release notes yet. Check back soon!
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-4">
          {items.map((n) => {
            const highlights = asStringArray(n.highlights);
            return (
              <li key={n.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                    <div>
                      <CardTitle className="text-lg">{n.title}</CardTitle>
                      {n.published_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(n.published_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    {n.version && <Badge variant="outline">v{n.version}</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {n.summary && (
                      <p className="text-sm text-foreground/80 whitespace-pre-line">
                        {n.summary}
                      </p>
                    )}
                    {highlights.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
                        {highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}