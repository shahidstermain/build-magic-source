import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Compass,
  Download,
  Lock,
  Loader2,
  MapPin,
  RefreshCw,
  Share2,
  Sparkles,
  Wallet,
  Wand2,
  Edit3,
  Users,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  BUDGET_OPTIONS,
  EXPANDED_INTEREST_OPTIONS,
  FITNESS_OPTIONS,
  GROUP_OPTIONS,
  ACCOMMODATION_OPTIONS,
  DIET_OPTIONS,
  ISLAND_OPTIONS,
  TRIP_PRICE_INR,
  type TripInputs,
  type TripPreview,
  type TripRecommendation,
  createTripPreview,
  fetchTripRecommendations,
  getTripDownloadUrl,
  regenerateTrip,
} from "@/lib/tripPlanner";
import { saveCollaborativeTrip } from "@/lib/collaborativeTrips";
import { PayTripDialog } from "@/components/PayTripDialog";
import { RecommendationsSection } from "@/components/RecommendationCard";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { TripPlannerLeadForm } from "@/components/TripPlannerLeadForm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Stage = "form" | "preview" | "generating" | "ready";

function defaultDates() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  const start = d.toISOString().slice(0, 10);
  const end = new Date(d.getTime() + 4 * 86400000).toISOString().slice(0, 10);
  return { start, end };
}

export default function TripPlanner() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const initialDates = defaultDates();
  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState<TripInputs["budget"]>("medium");
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [interests, setInterests] = useState<string[]>(["relaxation", "snorkeling"]);
  const [islands, setIslands] = useState<string[]>([]);

  // Richer profile context (Upgrade 1)
  const [travelers, setTravelers] = useState<number>(2);
  const [groupType, setGroupType] = useState<TripInputs["group_type"]>("couple");
  const [ages, setAges] = useState("");
  const [fitness, setFitness] = useState<TripInputs["fitness"]>("medium");
  const [accommodation, setAccommodation] = useState<TripInputs["accommodation"]>("midrange");
  const [diet, setDiet] = useState<TripInputs["diet"]>("non-vegetarian");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [permitsArranged, setPermitsArranged] = useState(false);
  const [returningVisitor, setReturningVisitor] = useState(false);
  const [isForeign, setIsForeign] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");

  // Collapsible section open state
  const [openProfile, setOpenProfile] = useState(false);
  const [openPreferences, setOpenPreferences] = useState(false);
  const [openLogistics, setOpenLogistics] = useState(false);

  // Keep days in sync with date range
  const syncDaysFromDates = (start: string, end: string) => {
    if (start && end) {
      const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
      if (diff > 0) setDays(diff);
    }
  };

  const onStartDateChange = (val: string) => {
    setStartDate(val);
    syncDaysFromDates(val, endDate);
  };

  const onEndDateChange = (val: string) => {
    setEndDate(val);
    syncDaysFromDates(startDate, val);
  };

  const onDaysChange = (val: number) => {
    setDays(val);
    if (startDate && val > 0) {
      const end = new Date(new Date(startDate).getTime() + val * 86400000)
        .toISOString()
        .slice(0, 10);
      setEndDate(end);
    }
  };

  const [stage, setStage] = useState<Stage>("form");
  const [submitting, setSubmitting] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TripPreview | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [teaserRecs, setTeaserRecs] = useState<TripRecommendation[]>([]);
  const [fullRecs, setFullRecs] = useState<TripRecommendation[]>([]);
  const [leadOpen, setLeadOpen] = useState(false);
  
  // Enhanced features
  const [isEditing, setIsEditing] = useState(false);
  const [tripNotes, setTripNotes] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [newCollaborator, setNewCollaborator] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?next=/trip-planner");
  }, [authLoading, user, navigate]);

  const toggle = <T extends string>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const onPreview = async () => {
    if (!startDate || !endDate || days < 1) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast({ title: "End date must be after start date", variant: "destructive" });
      return;
    }
    if (interests.length === 0) {
      toast({ title: "Pick at least one interest", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const inputs: TripInputs = {
        days,
        budget,
        start_date: startDate,
        end_date: endDate,
        interests,
        islands,
        travelers,
        group_type: groupType,
        ages: ages.trim() || undefined,
        fitness,
        accommodation,
        diet,
        avoid,
        permits_arranged: permitsArranged,
        returning_visitor: returningVisitor,
        is_foreign_national: isForeign,
        notes: extraNotes.trim() || undefined,
      };
      const result = await createTripPreview(inputs);
      setTripId(result.trip_id);
      setPreview(result.preview);
      setStage("preview");
      
      // Save collaborative data if present
      if ((tripNotes || collaborators.length > 0) && user) {
        const collabResult = await saveCollaborativeTrip(
          result.trip_id,
          user.id,
          result.preview.trip_title,
          tripNotes,
          collaborators
        );
        
        if (!collabResult.success) {
          console.warn("Failed to save collaborative trip data:", collabResult.error);
          // Don't block the preview if collaborative save fails
        }
      }
      
      // Fire-and-forget teaser recommendations (2 items)
      fetchTripRecommendations(result.trip_id, { teaserOnly: true })
        .then((recs) => setTeaserRecs(recs))
        .catch((err) => console.warn("teaser recs failed", err));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Preview failed";
      toast({ title: "Couldn't build preview", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDownloadUrl = async (id: string) => {
    try {
      const url = await getTripDownloadUrl(id);
      setDownloadUrl(url);
      setStage("ready");
      // Load full recommendations once the PDF is ready
      fetchTripRecommendations(id, { force: teaserRecs.length > 0 && fullRecs.length === 0 })
        .then((recs) => setFullRecs(recs))
        .catch((err) => console.warn("full recs failed", err));
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Couldn't load PDF";
      setGenError(msg);
    }
  };

  const onPaid = async (result: { storage_path?: string | null; generation_error?: string }) => {
    if (!tripId) return;
    setStage("generating");
    setGenError(null);
    if (result.generation_error) {
      setGenError(result.generation_error);
      return;
    }
    if (result.storage_path) {
      await fetchDownloadUrl(tripId);
    } else {
      // Poll briefly in case verify didn't surface the path
      let tries = 0;
      const tick = async () => {
        tries += 1;
        try {
          await fetchDownloadUrl(tripId);
        } catch {
          if (tries < 20) setTimeout(tick, 2000);
          else setGenError("Generation is taking longer than expected. Please retry.");
        }
      };
      setTimeout(tick, 1500);
    }
  };

  const onRetryGenerate = async () => {
    if (!tripId) return;
    setGenError(null);
    setStage("generating");
    try {
      const r = await regenerateTrip(tripId);
      if (r.status === "generated") await fetchDownloadUrl(tripId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setGenError(msg);
    }
  };

  const onShare = async () => {
    if (!downloadUrl) return;
    const shareData = {
      title: preview?.trip_title ?? "My Andaman trip plan",
      text: "Built with AndamanBazaar AI Trip Planner.",
      url: downloadUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(downloadUrl);
      toast({ title: "Link copied", description: "Share it before it expires (10 min)." });
    }
  };

  const addCollaborator = () => {
    if (newCollaborator.trim() && !collaborators.includes(newCollaborator.trim())) {
      setCollaborators([...collaborators, newCollaborator.trim()]);
      setNewCollaborator("");
    }
  };

  const removeCollaborator = (email: string) => {
    setCollaborators(collaborators.filter(c => c !== email));
  };

  if (authLoading || !user) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI Trip Planner
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Plan your Andaman trip in 60 seconds
        </h1>
        <p className="text-muted-foreground">
          Ferry-aware, weather-backed, budget-tuned. Built with a local insider mindset — no
          generic tourist fluff. Premium PDF for {formatPriceLabel(TRIP_PRICE_INR)}.
        </p>
      </header>

      {stage === "form" && (
        <Card className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="days">Number of days</Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => onDaysChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Budget</Label>
              <div className="grid grid-cols-3 gap-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBudget(b.id)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left text-xs transition-colors",
                      budget === b.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <div className="font-medium">{b.label}</div>
                    <div className="text-[10px] text-muted-foreground">{b.hint}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2">
              {EXPANDED_INTEREST_OPTIONS.map((i) => {
                const active = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInterests((arr) => toggle(arr, i))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred islands (optional)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ISLAND_OPTIONS.map((isl) => (
                <label key={isl} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={islands.includes(isl)}
                    onCheckedChange={() => setIslands((arr) => toggle(arr, isl))}
                  />
                  <span>{isl}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ========= Who's travelling ========= */}
          <Collapsible open={openProfile} onOpenChange={setOpenProfile} className="border-t pt-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer">Who's travelling</Label>
                <span className="text-xs text-muted-foreground">(personalises the plan)</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openProfile && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="travelers">Number of travellers</Label>
                  <Input
                    id="travelers"
                    type="number"
                    min={1}
                    max={30}
                    value={travelers}
                    onChange={(e) => setTravelers(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Group type</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {GROUP_OPTIONS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGroupType(g.id)}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-xs transition-colors",
                          groupType === g.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ages">Ages in group (optional)</Label>
                <Input
                  id="ages"
                  value={ages}
                  onChange={(e) => setAges(e.target.value)}
                  placeholder="e.g. 32, 30, child 6, infant 1"
                />
                <p className="text-[11px] text-muted-foreground">
                  Helps avoid impossible activities (e.g. scuba with infants).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Fitness level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FITNESS_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFitness(f.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-left text-xs transition-colors",
                        fitness === f.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <div className="font-medium">{f.label}</div>
                      <div className="text-[10px] text-muted-foreground">{f.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ========= Stay & food ========= */}
          <Collapsible open={openPreferences} onOpenChange={setOpenPreferences} className="border-t pt-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer">Stay & food preferences</Label>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openPreferences && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>Accommodation</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ACCOMMODATION_OPTIONS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccommodation(a.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs transition-colors",
                        accommodation === a.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Diet</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DIET_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiet(d.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs transition-colors",
                        diet === d.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ========= Logistics ========= */}
          <Collapsible open={openLogistics} onOpenChange={setOpenLogistics} className="border-t pt-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer">Logistics & avoid list</Label>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openLogistics && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Islands or activities to avoid (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {[...ISLAND_OPTIONS, "scuba", "treks", "long ferry rides"].map((item) => {
                    const active = avoid.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAvoid((arr) => toggle(arr, item))}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          active
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={permitsArranged}
                    onCheckedChange={(v) => setPermitsArranged(v === true)}
                  />
                  <span>Permits already arranged</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={returningVisitor}
                    onCheckedChange={(v) => setReturningVisitor(v === true)}
                  />
                  <span>Been to Andaman before</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={isForeign}
                    onCheckedChange={(v) => setIsForeign(v === true)}
                  />
                  <span>Foreign national</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extraNotes">Anything else? (optional)</Label>
                <Textarea
                  id="extraNotes"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Allergies, must-do bucket list, anniversaries…"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Collaborative Planning Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label>Collaborative Planning (Optional)</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Trip Notes</Label>
              <Textarea
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="Add notes about preferences, special requirements, or ideas..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Invite Collaborators</Label>
              <div className="flex gap-2">
                <Input
                  value={newCollaborator}
                  onChange={(e) => setNewCollaborator(e.target.value)}
                  placeholder="Enter email address"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCollaborator())}
                />
                <Button type="button" variant="outline" onClick={addCollaborator}>
                  Add
                </Button>
              </div>
              {collaborators.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {collaborators.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => removeCollaborator(email)}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button onClick={onPreview} disabled={submitting} size="lg" className="w-full">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Build my preview
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You'll see a free teaser. Pay {formatPriceLabel(TRIP_PRICE_INR)} only when you want the full plan.
          </p>
        </Card>
      )}

      {stage === "preview" && preview && (
        <div className="space-y-4">
          <Card className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Compass className="h-3.5 w-3.5" /> Preview
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {isEditing ? "Save" : "Edit"}
              </Button>
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={preview.trip_title}
                  onChange={(e) => setPreview({...preview, trip_title: e.target.value})}
                  className="text-2xl font-semibold"
                />
                <Textarea
                  value={preview.summary}
                  onChange={(e) => setPreview({...preview, summary: e.target.value})}
                  rows={3}
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold tracking-tight">{preview.trip_title}</h2>
                <p className="text-muted-foreground">{preview.summary}</p>
              </>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Day 1 — Morning
              </div>
              {isEditing ? (
                <Textarea
                  value={preview.day1_morning}
                  onChange={(e) => setPreview({...preview, day1_morning: e.target.value})}
                  className="mt-1"
                  rows={2}
                />
              ) : (
                <p className="mt-1 text-sm">{preview.day1_morning}</p>
              )}
            </div>

            {preview.season_warning && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                ⚠️ {preview.season_warning}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              {preview.highlights.map((h, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <Sparkles className="mb-1 h-3.5 w-3.5 text-primary" /> {h}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimated trip total</span>
              <span className="ml-auto font-semibold">
                ₹{preview.estimated_total_inr.toLocaleString("en-IN")}
              </span>
            </div>
            
            {/* Collaboration info */}
            {collaborators.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Shared with: {collaborators.join(", ")}</span>
              </div>
            )}
          </Card>

          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background backdrop-blur-[2px]" />
            <div className="space-y-3 opacity-50">
              <h3 className="text-lg font-semibold">Days 2–{days} · ferry logistics · budget · packing</h3>
              <p className="text-sm text-muted-foreground">
                Day-by-day morning / afternoon / evening · ferry slots · weather backups ·
                local food · hidden spots · packing checklist · emergency tips.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted" />
                ))}
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-3 py-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <p className="font-medium">Unlock full plan</p>
              <Button size="lg" onClick={() => setPayOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Pay {formatPriceLabel(TRIP_PRICE_INR)} & generate PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStage("form")}>
                Edit inputs
              </Button>
            </div>
          </Card>

          {teaserRecs.length > 0 && (
            <RecommendationsSection
              recommendations={teaserRecs}
              title="Book the essentials now"
              subtitle="Trusted partners hand-picked for this trip. The full list unlocks with the PDF."
              locked
            />
          )}
        </div>
      )}

      {stage === "generating" && (
        <Card className="space-y-3 p-10 text-center">
          {genError ? (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
                <RefreshCw className="h-5 w-5" />
              </div>
              <p className="font-medium">Generation failed</p>
              <p className="text-sm text-muted-foreground">{genError}</p>
              <Button onClick={onRetryGenerate}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry generation
              </Button>
              <p className="text-xs text-muted-foreground">
                You won't be charged again — payment is already confirmed.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Crafting your itinerary…</p>
              <p className="text-sm text-muted-foreground">
                Sequencing ferries, balancing budget, picking local spots. ~30 seconds.
              </p>
            </>
          )}
        </Card>
      )}

      {stage === "ready" && downloadUrl && (
        <Card className="space-y-4 p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Your plan is ready</h2>
          <p className="text-sm text-muted-foreground">
            Saved to your account. Download link refreshes from "My Trips" anytime.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </a>
            </Button>
            <Button variant="outline" size="lg" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <WhatsAppShare
              title={preview?.trip_title || "My Andaman Trip Plan"}
              url={downloadUrl}
              type="trip"
              variant="button"
              tripId={tripId || undefined}
            />
          </div>
          <div className="flex justify-center gap-3 pt-2 text-sm">
            <Link to="/my-trips" className="text-primary hover:underline">
              <MapPin className="mr-1 inline h-3.5 w-3.5" /> My trips
            </Link>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStage("form");
                setTripId(null);
                setPreview(null);
                setDownloadUrl(null);
                setTeaserRecs([]);
                setFullRecs([]);
              }}
            >
              Plan another
            </button>
          </div>
        </Card>
      )}

      {stage === "ready" && fullRecs.length > 0 && (
        <RecommendationsSection
          recommendations={fullRecs}
          title="Recommended for your trip"
          subtitle="One-click bookings for stays, ferries and activities that match your itinerary."
        />
      )}

      {stage === "ready" && (
        <section className="pt-2">
          <TripPlannerLeadForm />
        </section>
      )}

      {stage === "form" && (
        <section className="pt-2">
          <Card className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-sm">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden>🚢</span>
                <div>
                  <h3 className="text-base font-semibold sm:text-lg">
                    Want a custom plan built just for you?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Skip the form — talk to a real Andaman expert and get a tailored plan over a quick call.
                  </p>
                </div>
              </div>
              <Button onClick={() => setLeadOpen(true)} size="lg" className="w-full shrink-0 sm:w-auto">
                <Phone className="mr-2 h-4 w-4" /> Request a Callback
              </Button>
            </div>
          </Card>
        </section>
      )}

      <LeadCallbackSheet open={leadOpen} onOpenChange={setLeadOpen} />

      <PayTripDialog
        tripId={tripId}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={onPaid}
      />
    </div>
  );
}

function LeadCallbackSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-0 sm:max-w-2xl sm:mx-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Talk to an Andaman Travel Expert</SheetTitle>
        </SheetHeader>
        <div className="p-4 sm:p-6">
          <TripPlannerLeadForm className="border-0 shadow-none" />
        </div>
      </SheetContent>
    </Sheet>
  );
}