import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ISLAND_SUGGESTIONS = [
  "Port Blair",
  "Havelock",
  "Neil Island",
  "Baratang",
  "Diglipur",
  "Ross Island",
  "North Bay",
] as const;

const EXPERIENCE_SUGGESTIONS = [
  "Scuba diving",
  "Snorkeling",
  "Trekking",
  "Sunset cruise",
  "Island hopping",
  "Wildlife",
  "Photography",
  "Honeymoon",
] as const;

const leadSchema = z.object({
  name: z.string().trim().min(2, "Please share your name").max(100),
  whatsapp: z
    .string()
    .trim()
    .min(7, "Enter a valid WhatsApp number")
    .max(20, "Number is too long")
    .regex(/^[+\d\s-]+$/, "Only digits, spaces, + and - allowed"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  travel_from: z.string().min(1, "Pick a start date"),
  travel_to: z.string().min(1, "Pick an end date"),
  travelers: z.number().int().min(1).max(50),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type BookingLeadContext = "whatsapp_booking" | "provider_booking";

export interface BookingLeadDefaults {
  islands?: string[];
  experiences?: string[];
  startDate?: string;
  endDate?: string;
  travelers?: number;
  /** Free-form label for what's being booked, e.g. trip title or item name. */
  bookingTitle?: string;
}

interface BookingLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a lead is successfully captured. Receives the trimmed details. */
  onConfirmed: (lead: {
    name: string;
    whatsapp: string;
    email?: string;
    islands: string[];
    experiences: string[];
    notes?: string;
  }) => void;
  context: BookingLeadContext;
  defaults?: BookingLeadDefaults;
}

/**
 * Lead-capture dialog shown before WhatsApp / provider booking redirects.
 * Saves the lead to `trip_leads` and, when possible, also notifies the admin
 * via the existing `send-trip-lead` edge function. The original booking action
 * is invoked through `onConfirmed` so the user still ends up on WhatsApp /
 * the partner site.
 */
export function BookingLeadDialog({
  open,
  onOpenChange,
  onConfirmed,
  context,
  defaults,
}: BookingLeadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState(defaults?.startDate ?? "");
  const [to, setTo] = useState(defaults?.endDate ?? "");
  const [travelers, setTravelers] = useState<number>(defaults?.travelers ?? 2);
  const [islands, setIslands] = useState<string[]>(defaults?.islands ?? []);
  const [experiences, setExperiences] = useState<string[]>(
    defaults?.experiences ?? [],
  );
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const ctxCopy =
    context === "whatsapp_booking"
      ? {
          title: "Confirm your booking on WhatsApp",
          desc:
            "Share a couple of details so our Andaman team can help you complete the booking smoothly.",
          cta: "Send to WhatsApp",
        }
      : {
          title: "A few quick details before you book",
          desc:
            "We'll pass your interests to the partner so they can prep the right offer for you.",
          cta: "Continue to provider",
        };

  const parsed = useMemo(
    () =>
      leadSchema.safeParse({
        name,
        whatsapp,
        email,
        travel_from: from,
        travel_to: to,
        travelers,
        notes,
      }),
    [name, whatsapp, email, from, to, travelers, notes],
  );
  const isValid = parsed.success;

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit() {
    setErrors({});
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
      const tagLine = [
        defaults?.bookingTitle ? `Booking: ${defaults.bookingTitle}` : null,
        islands.length ? `Islands: ${islands.join(", ")}` : null,
        experiences.length ? `Experiences: ${experiences.join(", ")}` : null,
        data.email ? `Email: ${data.email}` : null,
        data.notes ? `Notes: ${data.notes}` : null,
        `Source: ${context}`,
      ]
        .filter(Boolean)
        .join(" · ");

      const { error } = await supabase.from("trip_leads").insert({
        name: data.name,
        whatsapp: data.whatsapp,
        travel_from: data.travel_from,
        travel_to: data.travel_to,
        travelers: data.travelers,
        budget_range: "Booking intent",
        query: tagLine || null,
      });
      if (error) throw error;

      // Best-effort admin notification — never block the booking flow.
      supabase.functions
        .invoke("send-trip-lead", {
          body: {
            name: data.name,
            whatsapp: data.whatsapp,
            travel_from: data.travel_from,
            travel_to: data.travel_to,
            travelers: String(data.travelers),
            budget_range: "Booking intent",
            query: tagLine,
          },
        })
        .catch((err) => {
          console.warn("send-trip-lead notify failed:", err?.message ?? err);
        });

      toast({
        title: "Got it — taking you there now",
        description: "Our team will follow up on WhatsApp within 24 hours.",
      });

      onOpenChange(false);
      onConfirmed({
        name: data.name,
        whatsapp: data.whatsapp,
        email: data.email || undefined,
        islands,
        experiences,
        notes: data.notes || undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't save your details";
      toast({ title: "Something went wrong", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }

    // If the user is signed in, prefill is handled at open time elsewhere; nothing to do here.
    void user;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ctxCopy.title}</DialogTitle>
          <DialogDescription>{ctxCopy.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bld-name">Full name *</Label>
              <Input
                id="bld-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                autoComplete="name"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bld-whatsapp">WhatsApp number *</Label>
              <Input
                id="bld-whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                maxLength={20}
                autoComplete="tel"
              />
              {errors.whatsapp && (
                <p className="text-xs text-destructive">{errors.whatsapp}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bld-email">Email (optional)</Label>
            <Input
              id="bld-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              maxLength={255}
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bld-from">Travel from *</Label>
              <Input
                id="bld-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              {errors.travel_from && (
                <p className="text-xs text-destructive">{errors.travel_from}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bld-to">Travel to *</Label>
              <Input
                id="bld-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || undefined}
              />
              {errors.travel_to && (
                <p className="text-xs text-destructive">{errors.travel_to}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bld-travelers">Travelers *</Label>
              <Input
                id="bld-travelers"
                type="number"
                min={1}
                max={50}
                value={travelers}
                onChange={(e) =>
                  setTravelers(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                }
              />
              {errors.travelers && (
                <p className="text-xs text-destructive">{errors.travelers}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred islands</Label>
            <div className="flex flex-wrap gap-1.5">
              {ISLAND_SUGGESTIONS.map((i) => {
                const active = islands.includes(i);
                return (
                  <Badge
                    key={i}
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer select-none transition-colors",
                      !active && "hover:bg-accent",
                    )}
                    onClick={() => toggle(islands, setIslands, i)}
                  >
                    {i}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred experiences</Label>
            <div className="flex flex-wrap gap-1.5">
              {EXPERIENCE_SUGGESTIONS.map((x) => {
                const active = experiences.includes(x);
                return (
                  <Badge
                    key={x}
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer select-none transition-colors",
                      !active && "hover:bg-accent",
                    )}
                    onClick={() => toggle(experiences, setExperiences, x)}
                  >
                    {x}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bld-notes">Anything else? (optional)</Label>
            <Textarea
              id="bld-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Honeymoon, kids, dietary needs, ferry preferences…"
              rows={3}
              maxLength={500}
            />
            <p className="text-right text-xs text-muted-foreground">{notes.length}/500</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {ctxCopy.cta}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}