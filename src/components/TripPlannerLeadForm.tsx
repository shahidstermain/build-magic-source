import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BUDGET_RANGES = [
  "Under ₹10,000 per person",
  "₹10,000 – ₹20,000 per person",
  "₹20,000 – ₹50,000 per person",
  "₹50,000+ per person",
] as const;

const CALL_TIMES = [
  "Morning (9 AM – 12 PM)",
  "Afternoon (12 PM – 3 PM)",
  "Evening (3 PM – 6 PM)",
] as const;

const leadSchema = z
  .object({
    name: z.string().trim().min(2, "Please share your name").max(100),
    whatsapp: z
      .string()
      .trim()
      .min(7, "Enter a valid WhatsApp number")
      .max(20, "Number is too long")
      .regex(/^[+\d\s-]+$/, "Only digits, spaces, + and - allowed"),
    travel_from: z.string().min(1, "Pick a start date"),
    travel_to: z.string().min(1, "Pick an end date"),
    travelers: z
      .number({ invalid_type_error: "Enter a number" })
      .int()
      .min(1, "At least 1 traveler"),
    budget_range: z.enum(BUDGET_RANGES),
    query: z.string().max(500).optional().or(z.literal("")),
    preferred_call_time: z.string().max(80).optional().or(z.literal("")),
  })
  .refine((d) => d.travel_to >= d.travel_from, {
    message: "End date must be on or after start date",
    path: ["travel_to"],
  });

type LeadFormProps = {
  className?: string;
  compact?: boolean;
};

export function TripPlannerLeadForm({ className, compact = false }: LeadFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [travelers, setTravelers] = useState<number | "">(2);
  const [budget, setBudget] = useState<string>("");
  const [query, setQuery] = useState("");
  const [callTime, setCallTime] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parsedLive = useMemo(
    () =>
      leadSchema.safeParse({
        name,
        whatsapp,
        travel_from: from,
        travel_to: to,
        travelers: typeof travelers === "number" ? travelers : Number(travelers),
        budget_range: budget,
        query,
        preferred_call_time: callTime,
      }),
    [name, whatsapp, from, to, travelers, budget, query, callTime],
  );
  const isValid = parsedLive.success;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = parsedLive;
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = parsed.data;
      const { error } = await supabase.from("trip_leads").insert({
        name: data.name,
        whatsapp: data.whatsapp,
        travel_from: data.travel_from,
        travel_to: data.travel_to,
        travelers: data.travelers,
        budget_range: data.budget_range,
        query: data.query || null,
        preferred_call_time: data.preferred_call_time || null,
      });
      if (error) throw error;

      // Wait for the notification email to confirm before showing success.
      const { error: emailError } = await supabase.functions.invoke("send-trip-lead", {
        body: {
          name: data.name,
          whatsapp: data.whatsapp,
          travel_from: data.travel_from,
          travel_to: data.travel_to,
          travelers: String(data.travelers),
          budget_range: data.budget_range,
          query: data.query,
          preferred_call_time: data.preferred_call_time,
        },
      });
      if (emailError) throw new Error(emailError.message || "Notification email failed");

      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Couldn't submit request", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card
        className={cn(
          "rounded-xl border-2 border-primary/30 bg-primary/5 p-6 shadow-md",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              ✅ Got it! Our Andaman expert will call you within 24 hours.
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your WhatsApp handy 🏝️
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-md",
        className,
      )}
    >
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>🌴</span>
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Talk to an Andaman Travel Expert 🌊
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Got a custom request? Want us to build your perfect Andaman trip plan over a phone call? Drop us a note — we'll call you back!
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-6 pt-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Full name *</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              autoComplete="name"
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-whatsapp">Your WhatsApp Number *</Label>
            <Input
              id="lead-whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+91 98XXXXXXXX"
              maxLength={20}
              autoComplete="tel"
              required
            />
            {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="lead-from">Travel from *</Label>
            <Input
              id="lead-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
            {errors.travel_from && <p className="text-xs text-destructive">{errors.travel_from}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-to">Travel to *</Label>
            <Input
              id="lead-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from || undefined}
              required
            />
            {errors.travel_to && <p className="text-xs text-destructive">{errors.travel_to}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-travelers">No. of travelers *</Label>
            <Input
              id="lead-travelers"
              type="number"
              min={1}
              max={50}
              value={travelers}
              onChange={(e) => {
                const v = e.target.value;
                setTravelers(v === "" ? "" : Math.max(1, Math.min(50, Number(v))));
              }}
              required
            />
            {errors.travelers && <p className="text-xs text-destructive">{errors.travelers}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-budget">Budget range *</Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger id="lead-budget">
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_RANGES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.budget_range && <p className="text-xs text-destructive">{errors.budget_range}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-call-time">Preferred call time</Label>
            <Select value={callTime} onValueChange={setCallTime}>
              <SelectTrigger id="lead-call-time">
                <SelectValue placeholder="Anytime" />
              </SelectTrigger>
              <SelectContent>
                {CALL_TIMES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!compact && (
          <div className="space-y-1.5">
            <Label htmlFor="lead-query">Your query / custom request</Label>
            <Textarea
              id="lead-query"
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 500))}
              placeholder="e.g. Honeymoon trip, scuba diving package, family with kids, budget backpacker..."
              rows={3}
              maxLength={500}
            />
            <p className="text-right text-xs text-muted-foreground">{query.length}/500</p>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-lg"
          disabled={submitting || !isValid}
          aria-disabled={submitting || !isValid}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <><Phone className="mr-2 h-4 w-4" /> Request a Callback</>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          🤿 Free consultation • 🚢 No spam • Reply within 24 hours
        </p>
      </form>
    </Card>
  );
}