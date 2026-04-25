import { useState } from "react";
import { ThumbsDown, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitTripDayFeedback } from "@/lib/tripPlanner";

type Day = {
  day: number;
  date?: string;
  island?: string;
  morning?: string;
};

type Props = {
  tripId: string;
  days: Day[];
};

/**
 * Lets a user flag a single day as "this was wrong" with an optional comment.
 * Posts to the `trip-feedback` edge function. One submission per day per user.
 */
export function TripDayFeedback({ tripId, days }: Props) {
  const { toast } = useToast();
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneDays, setDoneDays] = useState<Set<number>>(new Set());

  if (!days || days.length === 0) return null;

  const submit = async (dayNumber: number) => {
    setSubmitting(true);
    try {
      await submitTripDayFeedback({
        trip_id: tripId,
        day_number: dayNumber,
        is_helpful: false,
        comment: comment.trim() || undefined,
      });
      setDoneDays((prev) => new Set(prev).add(dayNumber));
      setActiveDay(null);
      setComment("");
      toast({ title: "Thanks — flagged", description: "We'll use this to improve future plans." });
    } catch (err) {
      toast({
        title: "Couldn't send feedback",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Spot something off?
      </p>
      <div className="space-y-2">
        {days.map((d) => {
          const flagged = doneDays.has(d.day);
          const isActive = activeDay === d.day;
          return (
            <div
              key={d.day}
              className="rounded-lg border border-border bg-background p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">Day {d.day}</span>
                {d.island && (
                  <span className="text-xs text-muted-foreground">· {d.island}</span>
                )}
                <div className="ml-auto">
                  {flagged ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Flagged
                    </span>
                  ) : isActive ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveDay(d.day);
                        setComment("");
                      }}
                    >
                      <ThumbsDown className="mr-1 h-3.5 w-3.5" /> This was wrong
                    </Button>
                  )}
                </div>
              </div>
              {isActive && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What's wrong? (optional — e.g. ferry timing, closed spot, impossible route)"
                    rows={2}
                    maxLength={500}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveDay(null);
                        setComment("");
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => submit(d.day)}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Send feedback
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}