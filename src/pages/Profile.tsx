import { ChangeEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ANDAMAN_AREAS } from "@/lib/listings";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+0-9 \-()]*$/i, "Use digits, spaces, +, -, ( )")
    .optional()
    .or(z.literal("")),
  area: z.string().max(80).optional().or(z.literal("")),
});

type ProfileRow = {
  id: string;
  name: string | null;
  phone: string | null;
  area: string | null;
  city: string | null;
  photo_url: string | null;
  is_location_verified: boolean;
  total_listings: number;
  successful_sales: number;
};

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, phone, area, city, photo_url, is_location_verified, total_listings, successful_sales")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load profile", description: error.message, variant: "destructive" });
      }
      const p = (data as ProfileRow | null) ?? null;
      setProfile(p);
      setName(p?.name ?? "");
      setPhone(p?.phone ?? "");
      setArea(p?.area ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const onPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const url = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ photo_url: url })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      setProfile((prev) => (prev ? { ...prev, photo_url: url } : prev));
      toast({ title: "Photo updated" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Could not upload", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    const parsed = profileSchema.safeParse({ name, phone, area });
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        area: parsed.data.area || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile saved" });
    setProfile((prev) =>
      prev ? { ...prev, name: parsed.data.name, phone: parsed.data.phone || null, area: parsed.data.area || null } : prev,
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initial = (profile?.name || user.email || "?").slice(0, 1).toUpperCase();

  return (
    <section className="mx-auto max-w-2xl py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How other islanders see you on AndamanBazaar.
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.photo_url ?? undefined} alt="" />
            <AvatarFallback className="text-xl">{initial}</AvatarFallback>
          </Avatar>
          <label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onPhotoChange}
              disabled={uploading}
            />
          </label>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{profile?.name || "Add your name"}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{profile?.total_listings ?? 0} listings</Badge>
            <Badge variant="secondary">{profile?.successful_sales ?? 0} sales</Badge>
            {profile?.is_location_verified && (
              <Badge className="bg-success text-success-foreground">
                <ShieldCheck className="mr-1 h-3 w-3" /> Island verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ravi K."
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9XXXX XXXXX"
            inputMode="tel"
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Shown only to people you chat with — never public.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area">Island / area</Label>
          <Select value={area || "none"} onValueChange={(v) => setArea(v === "none" ? "" : v)}>
            <SelectTrigger id="area">
              <SelectValue placeholder="Select your island" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {ANDAMAN_AREAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </section>
  );
};

export default Profile;