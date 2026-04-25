import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ImagePlus, Info, Loader2, Sparkles, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ANDAMAN_AREAS,
  CATEGORIES,
  CONDITIONS,
  EXPERIENCE_SUBCATEGORIES,
  EXPERIENCE_SEASON_NOTE,
  DIVE_SITES,
  ListingCondition,
} from "@/lib/listings";

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(4, "Add a clear title (4+ chars)").max(120),
  description: z.string().trim().min(10, "Add at least a short description").max(2000),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price can't be negative")
    .max(99999999, "Price too high"),
  category: z.string().min(1, "Pick a category"),
  condition: z.string().min(1, "Pick a condition"),
  area: z.string().min(1, "Pick an area"),
});

type NewPhoto = { kind: "new"; file: File; preview: string };
type ExistingPhoto = { kind: "existing"; id: string; image_url: string };
type Photo = NewPhoto | ExistingPhoto;

const CreateListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [area, setArea] = useState("Port Blair");
  const [subcategory, setSubcategory] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removedExistingIds, setRemovedExistingIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const isExperience = category === "experiences";
  const diveSites = DIVE_SITES[area] ?? [];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?next=/sell${isEdit ? `?edit=${editId}` : ""}`, { replace: true });
    }
  }, [authLoading, user, navigate, isEdit, editId]);

  // Load existing listing for edit
  useEffect(() => {
    if (!isEdit || !user) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, description, price, category, condition, area, seller_id, listing_images(id, image_url, display_order)",
        )
        .eq("id", editId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast({ title: "Could not load listing", variant: "destructive" });
        navigate("/sell", { replace: true });
        return;
      }
      if (data.seller_id !== user.id) {
        toast({ title: "You can only edit your own listings", variant: "destructive" });
        navigate(`/listings/${editId}`, { replace: true });
        return;
      }
      setTitle(data.title);
      setDescription(data.description ?? "");
      setPrice(String(data.price));
      setCategory(data.category);
      setCondition(data.condition as ListingCondition);
      setArea(data.area ?? "Port Blair");
      setSubcategory((data as any).subcategory ?? "");
      const sorted = [...(data.listing_images ?? [])].sort(
        (a, b) => a.display_order - b.display_order,
      );
      setPhotos(
        sorted.map((img) => ({
          kind: "existing" as const,
          id: img.id,
          image_url: img.image_url,
        })),
      );
      setFetching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editId, user, navigate, toast]);

  useEffect(
    () => () =>
      photos.forEach((p) => {
        if (p.kind === "new") URL.revokeObjectURL(p.preview);
      }),
    [photos],
  );

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const next: Photo[] = [];
    for (const file of files) {
      if (photos.length + next.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Only images allowed", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast({ title: `${file.name} is too large`, description: "Max 5 MB", variant: "destructive" });
        continue;
      }
      next.push({ kind: "new", file, preview: URL.createObjectURL(file) });
    }
    setPhotos((cur) => [...cur, ...next]);
  };

  const removePhoto = (i: number) => {
    setPhotos((cur) => {
      const copy = [...cur];
      const [removed] = copy.splice(i, 1);
      if (removed?.kind === "new") URL.revokeObjectURL(removed.preview);
      if (removed?.kind === "existing") setRemovedExistingIds((p) => [...p, removed.id]);
      return copy;
    });
  };

  const onAiHelp = async () => {
    if (title.trim().length < 4) {
      toast({ title: "Add a title first", description: "Few words is enough — boat pe bharosa rakho.", variant: "destructive" });
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-listing-description", {
        body: { title, category, condition, area, price },
      });
      if (error) throw error;
      const text = (data as { description?: string; error?: string })?.description;
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) {
        toast({ title: "AI helper", description: errMsg, variant: "destructive" });
        return;
      }
      if (!text) {
        toast({ title: "AI helper", description: "Empty response, try again.", variant: "destructive" });
        return;
      }
      setDescription(text);
      toast({ title: "Description added", description: "Edit it however you like." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Try again in a moment";
      toast({ title: "AI helper unavailable", description: message, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = schema.safeParse({
      title,
      description,
      price: Number(price),
      category,
      condition,
      area,
    });
    if (!parsed.success) {
      toast({
        title: "Check the form",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    if (isExperience && !subcategory) {
      toast({ title: "Pick an activity type", variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: "Add at least one photo", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let listingId = editId ?? "";

      if (isEdit) {
        const { error: updErr } = await supabase
          .from("listings")
          .update({
            title: parsed.data.title,
            description: parsed.data.description,
            price: parsed.data.price,
            category: parsed.data.category,
            condition: parsed.data.condition as ListingCondition,
            area: parsed.data.area,
            subcategory: isExperience ? subcategory : null,
          })
          .eq("id", editId!);
        if (updErr) throw updErr;
      } else {
        const { data: created, error: insertErr } = await supabase
          .from("listings")
          .insert({
            seller_id: user.id,
            title: parsed.data.title,
            description: parsed.data.description,
            price: parsed.data.price,
            category: parsed.data.category,
            condition: parsed.data.condition as ListingCondition,
            area: parsed.data.area,
            city: "Port Blair",
            subcategory: isExperience ? subcategory : null,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        listingId = created.id;
      }

      // Delete removed existing images
      if (removedExistingIds.length > 0) {
        await supabase.from("listing_images").delete().in("id", removedExistingIds);
      }

      // Update display_order for kept existing images
      const existingKept = photos.filter((p): p is ExistingPhoto => p.kind === "existing");
      for (let i = 0; i < existingKept.length; i++) {
        const p = existingKept[i];
        const order = photos.findIndex((x) => x === p);
        await supabase.from("listing_images").update({ display_order: order }).eq("id", p.id);
      }

      // Upload new images
      const newPhotos = photos.filter((p): p is NewPhoto => p.kind === "new");
      const uploaded: { image_url: string; display_order: number; listing_id: string }[] = [];
      for (let i = 0; i < newPhotos.length; i++) {
        const p = newPhotos[i];
        const order = photos.findIndex((x) => x === p);
        const ext = p.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${listingId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, p.file, { contentType: p.file.type, upsert: false, cacheControl: "31536000" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push({ image_url: pub.publicUrl, display_order: order, listing_id: listingId });
      }
      if (uploaded.length > 0) {
        const { error: imgErr } = await supabase.from("listing_images").insert(uploaded);
        if (imgErr) throw imgErr;
      }

      toast({
        title: isEdit ? "Listing updated" : "Listing posted",
        description: isEdit ? "Changes are live." : "It's live for buyers to see.",
      });
      navigate(`/listings/${listingId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({ title: isEdit ? "Could not update" : "Could not post listing", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl py-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isEdit ? "Edit listing" : "Post a listing"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isEdit
          ? "Update details, swap photos, save when ready."
          : "Share what you want to sell. Add clear photos and an honest description."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div>
          <Label>Photos</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">First photo is the cover. Up to {MAX_PHOTOS}.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div
                key={p.kind === "new" ? p.preview : p.id}
                className="relative aspect-square overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={p.kind === "new" ? p.preview : p.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground hover:bg-background"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Cover
                  </span>
                )}
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                <ImagePlus className="h-5 w-5" />
                Add photo
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Honda Activa 2019, well maintained" maxLength={120} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (₹)</Label>
            <Input id="price" type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 45000" />
          </div>
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as ListingCondition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
              <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Area</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANDAMAN_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Experience-specific fields */}
        {isExperience && (
          <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">Experience details</p>

            <div className="space-y-1.5">
              <Label>Activity type <span className="text-destructive">*</span></Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_SUBCATEGORIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                      <span className="ml-2 text-xs text-muted-foreground">{s.priceHint}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {diveSites.length > 0 && (
              <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Popular spots in {area}</p>
                <p>{diveSites.join(" · ")}</p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-none" />
              <span>{EXPERIENCE_SEASON_NOTE}</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAiHelp}
              disabled={aiBusy}
              className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
            >
              {aiBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Help me write
            </Button>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Condition, age, what's included, why you're selling…"
            rows={5}
            maxLength={2000}
          />
          <p className="text-right text-[11px] text-muted-foreground">{description.length}/2000</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link to={isEdit ? `/listings/${editId}` : "/listings"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Post listing"}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default CreateListing;
