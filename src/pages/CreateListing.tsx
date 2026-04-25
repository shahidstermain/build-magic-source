import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, Loader2, X } from "lucide-react";
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
import { ANDAMAN_AREAS, CATEGORIES, CONDITIONS, ListingCondition } from "@/lib/listings";

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

type Photo = { file: File; preview: string };

const CreateListing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [area, setArea] = useState("Port Blair");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?next=/sell", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), [photos]);

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
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotos((cur) => [...cur, ...next]);
  };

  const removePhoto = (i: number) => {
    setPhotos((cur) => {
      const copy = [...cur];
      const [removed] = copy.splice(i, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return copy;
    });
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
    if (photos.length === 0) {
      toast({ title: "Add at least one photo", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
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
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      const listingId = created.id;
      const uploaded: { image_url: string; display_order: number; listing_id: string }[] = [];

      for (let i = 0; i < photos.length; i++) {
        const { file } = photos[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${listingId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push({ image_url: pub.publicUrl, display_order: i, listing_id: listingId });
      }

      if (uploaded.length > 0) {
        const { error: imgErr } = await supabase.from("listing_images").insert(uploaded);
        if (imgErr) throw imgErr;
      }

      toast({ title: "Listing posted", description: "It's live for buyers to see." });
      navigate(`/listings/${listingId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({ title: "Could not post listing", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Post a listing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Share what you want to sell. Add clear photos and an honest description.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div>
          <Label>Photos</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">First photo is the cover. Up to {MAX_PHOTOS}.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.preview} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
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
            <Select value={category} onValueChange={setCategory}>
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

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
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
            <Link to="/listings">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post listing
          </Button>
        </div>
      </form>
    </section>
  );
};

export default CreateListing;