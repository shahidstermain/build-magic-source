import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Anchor, Compass, ShieldCheck, Phone, Info } from "lucide-react";
import logoUrl from "@/assets/logo.webp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { LEGAL_VERSIONS, recordLegalAcceptanceIfMissing } from "@/lib/legal";

const LegalDialog = ({
  trigger,
  title,
  description,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <Dialog>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="max-w-3xl p-0">
      <DialogHeader className="border-b border-border px-6 py-4">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] px-6">
        <div className="py-2">{children}</div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);
import { Loader2, MapPin, Anchor, Compass, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { usePageSeo } from "@/hooks/usePageSeo";

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "Tell us your name").max(80);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+]?[0-9\s-]{7,20}$/, "Enter a valid phone number");

const ISLAND_FACTS = [
  {
    badge: "01",
    badgeClass: "bg-warning text-warning-foreground",
    rotate: "-rotate-1 hover:rotate-0",
    icon: Anchor,
    heading: "Hyperlocal Commerce",
    body: "Buy fresh catches from Havelock or sell handicrafts from Port Blair — no mainland middlemen.",
  },
  {
    badge: "02",
    badgeClass: "bg-success text-success-foreground",
    rotate: "rotate-1 hover:rotate-0",
    icon: ShieldCheck,
    heading: "Island Verified Trust",
    body: "GPS-authenticated sellers verified by locals. Real people, real products, real bharosa.",
  },
  {
    badge: "03",
    badgeClass: "bg-accent text-accent-foreground",
    rotate: "-rotate-1 hover:rotate-0",
    icon: Compass,
    heading: "Ferry-Aware Planning",
    body: "Our AI plans itineraries around real Makruzz & Green Ocean schedules. Never miss a boat.",
  },
];

const AuthView = () => {
  const [params] = useSearchParams();
  const initialMode = (params.get("mode") as Mode) || "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const next = params.get("next") || "/";

  usePageSeo({
    title: mode === "signup" ? "Create Account — AndamanBazaar" : mode === "forgot" ? "Reset Password — AndamanBazaar" : "Sign In — AndamanBazaar",
    description: "Sign in or create your AndamanBazaar account to buy, sell, and discover experiences across the Andaman Islands.",
    path: "/auth",
    noIndex: true,
  });

  useEffect(() => {
    if (!loading && session) {
      // Backfill legal acceptance records on the first authenticated visit.
      // RLS allows users to insert their own rows; duplicate versions are skipped.
      void recordLegalAcceptanceIfMissing(session.user.id);
      navigate(next, { replace: true });
    }
  }, [loading, session, navigate, next]);

  const validate = () => {
    if (mode === "signup") {
      const n = nameSchema.safeParse(name);
      if (!n.success) return n.error.issues[0].message;
    }
    const e = emailSchema.safeParse(email);
    if (!e.success) return e.error.issues[0].message;
    if (mode !== "forgot") {
      const p = passwordSchema.safeParse(password);
      if (!p.success) return p.error.issues[0].message;
    }
    if (mode === "signup" && phone.trim().length > 0) {
      const ph = phoneSchema.safeParse(phone);
      if (!ph.success) return ph.error.issues[0].message;
    }
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Check your details", description: err, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name,
              phone: phone.trim() || null,
              accepted_terms_version: LEGAL_VERSIONS.terms,
              accepted_privacy_version: LEGAL_VERSIONS.privacy,
              accepted_at: new Date().toISOString(),
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Check your inbox",
          description: "We sent you a confirmation link to finish signing up.",
        });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next, { replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent", description: "Check your email to set a new password." });
        setMode("signin");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({ title: "Could not continue", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      // Lovable Cloud managed Google OAuth — works on .lovable.app subdomains
      // AND on custom domains (oauth.lovable.app proxy handles the callback).
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate(next, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast({ title: "Google sign-in failed", description: message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">

      {/* ── Left panel — brand marketing ───────────────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        {/* Decorative coastal blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-warning/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-48 h-[32rem] w-[32rem] rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-success/20 blur-3xl" />

        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <img src={logoUrl} alt="AndamanBazaar" className="h-12 w-12 rotate-3 rounded-xl bg-background p-1 shadow-elevated" />
          <span className="text-2xl font-extrabold uppercase tracking-tight">
            Andaman<span className="opacity-90">Bazaar</span>
          </span>
        </Link>

        {/* Hero copy + feature stack */}
        <div className="relative z-10 my-8 space-y-10">
          <div className="space-y-4">
            <span className="inline-block rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm">
              Andaman & Nicobar Islands
            </span>
            <h1 className="text-balance text-5xl font-extrabold leading-[0.95] tracking-tight xl:text-6xl">
              Taming the <span className="text-warning">Tides</span> of Island Trade.
            </h1>
            <p className="max-w-md text-base text-primary-foreground/75">
              The hyperlocal marketplace + AI trip planner built for the rhythm of the archipelago.
            </p>
          </div>

          {/* Tilted feature cards */}
          <ul className="space-y-4">
            {ISLAND_FACTS.map(({ icon: Icon, heading, body, badge, badgeClass, rotate }) => (
              <li
                key={heading}
                className={`group rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-md transition-transform duration-300 hover:rotate-0 ${rotate}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`grid h-11 w-11 flex-none place-items-center rounded-full font-bold ${badgeClass}`}>
                    {badge}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 opacity-70" />
                      <h3 className="text-base font-bold">{heading}</h3>
                    </div>
                    <p className="mt-1 text-sm text-primary-foreground/75">{body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust signal + tagline */}
        <div className="relative z-10 space-y-5">
          <div className="inline-block rotate-2 rounded-full bg-warning px-6 py-3 text-xl font-black tracking-tight text-warning-foreground shadow-elevated">
            Boat pe bharosa.
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-primary-foreground/70">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-primary bg-gradient-to-br from-accent to-warning"
                />
              ))}
            </div>
            <span className="font-medium">Joined by islanders across A&N this week</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col justify-center bg-background px-6 py-12 lg:px-10">
        {/* Subtle mobile background tint */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent lg:hidden" />

        {/* Mobile logo */}
        <Link to="/" className="relative mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={logoUrl} alt="AndamanBazaar" className="h-10 w-10 rotate-3 rounded-xl bg-card p-1 shadow-card" />
          <span className="text-lg font-extrabold uppercase tracking-tight">
            Andaman<span className="text-primary">Bazaar</span>
          </span>
        </Link>

        <div className="relative mx-auto w-full max-w-sm space-y-6">

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {mode === "signup" && "Join the bazaar"}
              {mode === "signin" && "Welcome back"}
              {mode === "forgot" && "Reset your password"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signup" && "Create your free account — start selling in minutes."}
              {mode === "signin" && "Sign in to keep selling, chatting and planning trips."}
              {mode === "forgot" && "We'll email you a link to set a new password."}
            </p>
          </div>

          {/* Google */}
          {mode !== "forgot" && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2.5 border-border"
              onClick={onGoogle}
              disabled={busy}
            >
              <svg className="h-4 w-4 flex-none" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          )}

          {mode !== "forgot" && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or with email
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ravi Kumar"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone number
                  </Label>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Optional
                  </span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  inputMode="tel"
                />
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] leading-snug text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                  <p>
                    We'll soon require a verified phone number to post listings. Adding it now means
                    one tap to verify later — your account is created either way.
                  </p>
                </div>
              </div>
            )}

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                />
              </div>
            )}

            <Button type="submit" size="lg" className="w-full font-bold shadow-elevated" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" && "Create my account"}
              {mode === "signin" && "Enter the bazaar"}
              {mode === "forgot" && "Send reset link"}
            </Button>
          </form>

          {/* Mode switcher */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button className="font-medium text-primary hover:underline" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </>
            )}
            {mode === "signin" && (
              <>
                New to AndamanBazaar?{" "}
                <button className="font-medium text-primary hover:underline" onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </>
            )}
            {mode === "forgot" && (
              <>
                Remembered it?{" "}
                <button className="font-medium text-primary hover:underline" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              </>
            )}
          </p>

          {/* Legal */}
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <p>By continuing you agree to our</p>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              <LegalDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-1 sm:py-0 sm:text-xs sm:font-normal sm:text-muted-foreground sm:shadow-none sm:underline sm:underline-offset-2 sm:hover:bg-transparent sm:hover:text-foreground"
                  >
                    Terms of Service
                  </button>
                }
                title="Terms of Service"
                description="Preview of our Terms — opens the full page in a new tab from the link below."
              >
                <TermsOfService />
                <p className="mt-4 text-xs text-muted-foreground">
                  <Link to="/terms" target="_blank" rel="noopener" className="underline">
                    Open full page in a new tab ↗
                  </Link>
                </p>
              </LegalDialog>
              <span className="hidden text-muted-foreground sm:inline">and</span>
              <LegalDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-1 sm:py-0 sm:text-xs sm:font-normal sm:text-muted-foreground sm:shadow-none sm:underline sm:underline-offset-2 sm:hover:bg-transparent sm:hover:text-foreground"
                  >
                    Privacy Policy
                  </button>
                }
                title="Privacy Policy"
                description="Preview of our Privacy Policy — opens the full page in a new tab from the link below."
              >
                <PrivacyPolicy />
                <p className="mt-4 text-xs text-muted-foreground">
                  <Link to="/privacy" target="_blank" rel="noopener" className="underline">
                    Open full page in a new tab ↗
                  </Link>
                </p>
              </LegalDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
