import { ChangeEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Camera, Clock, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Badge } from "@/components/ui/badge";
import { ANDAMAN_AREAS } from "@/lib/listings";
import { GitHubSyncCard } from "@/components/GitHubSyncCard";
import { LegalAcceptancesCard } from "@/components/LegalAcceptancesCard";

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
  phone_verified_at: string | null;
};

type VerificationRequest = {
  id: string;
  requested_area: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
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
  const [verification, setVerification] = useState<VerificationRequest | null>(null);
  const [verifyArea, setVerifyArea] = useState<string>("");
  const [verifyNote, setVerifyNote] = useState("");
  const [verifyDocFile, setVerifyDocFile] = useState<File | null>(null);
  const [submittingVerify, setSubmittingVerify] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data, error }, { data: vr, error: vrErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, phone, area, city, photo_url, is_location_verified, total_listings, successful_sales, phone_verified_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("verification_requests")
          .select("id, requested_area, status, reviewer_note, created_at, reviewed_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load profile", description: error.message, variant: "destructive" });
      }
      if (vrErr) {
        toast({ title: "Could not load verification", description: vrErr.message, variant: "destructive" });
      }
      const p = (data as ProfileRow | null) ?? null;
      setProfile(p);
      setName(p?.name ?? "");
      setPhone(p?.phone ?? "");
      setArea(p?.area ?? "");
      setVerification((vr as VerificationRequest | null) ?? null);
      setVerifyArea((vr?.requested_area as string | undefined) ?? p?.area ?? "");
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

  const submitVerification = async () => {
    if (!verifyArea) {
      toast({ title: "Select an area", description: "Choose your island/area to verify.", variant: "destructive" });
      return;
    }
    setSubmittingVerify(true);
    try {
      let docUrl: string | null = null;
      if (verifyDocFile) {
        if (verifyDocFile.size > 5 * 1024 * 1024) {
          throw new Error("ID document must be under 5MB.");
        }
        const ext = verifyDocFile.name.split(".").pop()?.toLowerCase() || "jpg";
        // NOTE: Ideally this should go to a private 'verification-docs' bucket.
        // Until that bucket is created in Supabase, we store under a restricted
        // path prefix. Ensure RLS on listing-images restricts this path to admins only.
        const path = `verification-docs/${user.id}/verify-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, verifyDocFile, { contentType: verifyDocFile.type, upsert: false, cacheControl: "31536000" });
        if (upErr) throw upErr;
        docUrl = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          requested_area: verifyArea,
          note: verifyNote.trim() || null,
          id_document_url: docUrl,
        })
        .select("id, requested_area, status, reviewer_note, created_at, reviewed_at")
        .single();
      if (error) throw error;
      setVerification(data as VerificationRequest);
      setVerifyDocFile(null);
      setVerifyNote("");
      toast({ title: "Verification submitted", description: "We'll review and update you soon." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit";
      toast({ title: "Could not submit", description: message, variant: "destructive" });
    } finally {
      setSubmittingVerify(false);
    }
  };

  const cancelVerification = async () => {
    if (!verification) return;
    const prev = verification;
    setVerification({ ...verification, status: "cancelled" });
    const { error } = await supabase
      .from("verification_requests")
      .update({ status: "cancelled" })
      .eq("id", verification.id);
    if (error) {
      setVerification(prev);
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request cancelled" });
    }
  };

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
        .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
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
          <PhoneVerificationStatus
            phone={profile?.phone ?? null}
            verifiedAt={profile?.phone_verified_at ?? null}
            phoneEdited={(profile?.phone ?? "") !== phone.trim()}
          />
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

      {/* Island verification */}
      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Island verification</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified sellers get a trust badge that buyers can see on every listing.
            </p>
          </div>
          <VerificationBadge
            verified={!!profile?.is_location_verified}
            status={verification?.status}
          />
        </div>

        {profile?.is_location_verified ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
            <p className="font-medium text-success-foreground">
              You're verified for {profile.area || "your island"}.
            </p>
            <p className="mt-1 text-muted-foreground">
              To change your verified location, submit a new request below.
            </p>
          </div>
        ) : verification?.status === "pending" ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <div>
              <p className="font-medium">Pending review</p>
              <p className="mt-1 text-muted-foreground">
                Requested for <span className="font-medium">{verification.requested_area}</span> on{" "}
                {new Date(verification.created_at).toLocaleDateString()}.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={cancelVerification}>
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
          </div>
        ) : verification?.status === "rejected" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-medium">Previous request was rejected</p>
            {verification.reviewer_note && (
              <p className="mt-1 text-muted-foreground">Reviewer: {verification.reviewer_note}</p>
            )}
            <p className="mt-1 text-muted-foreground">You can submit a new request below.</p>
          </div>
        ) : null}

        {!profile?.is_location_verified && verification?.status !== "pending" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="verify-area">Island / area to verify</Label>
              <Select value={verifyArea} onValueChange={setVerifyArea}>
                <SelectTrigger id="verify-area">
                  <SelectValue placeholder="Select your island" />
                </SelectTrigger>
                <SelectContent>
                  {ANDAMAN_AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-doc">ID document (optional)</Label>
              <Input
                id="verify-doc"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setVerifyDocFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Upload an island ID, ration card, or utility bill (max 5MB). Only admins can view it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-note">Note (optional)</Label>
              <Textarea
                id="verify-note"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Anything that helps us verify your residence."
                rows={3}
                maxLength={500}
              />
            </div>

            <Button onClick={submitVerification} disabled={submittingVerify} className="w-full sm:w-auto">
              {submittingVerify && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for verification
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <GitHubSyncCard />
      </div>

      {user && (
        <div className="mt-6">
          <LegalAcceptancesCard userId={user.id} />
        </div>
      )}
    </section>
  );
};

function VerificationBadge({
  verified,
  status,
}: {
  verified: boolean;
  status?: "pending" | "approved" | "rejected" | "cancelled";
}) {
  if (verified) {
    return (
      <Badge className="bg-success text-success-foreground">
        <ShieldCheck className="mr-1 h-3 w-3" /> Verified
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" /> Pending
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive">
        <ShieldX className="mr-1 h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <ShieldQuestion className="mr-1 h-3 w-3" /> Not verified
    </Badge>
  );
}

function PhoneVerificationStatus({
  phone,
  verifiedAt,
  phoneEdited,
}: {
  phone: string | null;
  verifiedAt: string | null;
  phoneEdited: boolean;
}) {
  if (!phone) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
        <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Add a phone number to enable verification.</span>
      </div>
    );
  }
  if (verifiedAt && !phoneEdited) {
    const date = new Date(verifiedAt);
    const formatted = date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return (
      <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-2 text-xs">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-foreground" />
        <span className="text-success-foreground">
          Phone verified on <span className="font-medium">{formatted}</span>.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs">
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      <span className="text-destructive">
        {phoneEdited && verifiedAt
          ? "Phone number changed — verification will be required again once enabled."
          : "Phone not verified yet."}
      </span>
    </div>
  );
}

export default Profile;