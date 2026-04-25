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
import { Loader2, MapPin, Anchor, Compass, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/logo.webp";

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "Tell us your name").max(80);

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
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const next = params.get("next") || "/";

  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true });
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
            data: { name },
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
      // On Lovable Cloud the /~oauth/initiate proxy exists and handles the flow.
      // Locally that route doesn't exist, so we fall back to Supabase native OAuth.
      const isLovableCloud = window.location.hostname.endsWith(".lovable.app") ||
        window.location.hostname.endsWith(".lovableproject.com");

      if (isLovableCloud) {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (result.error) throw result.error;
        if (!result.redirected) navigate(next, { replace: true });
      } else {
        // Local dev — use Supabase OAuth directly
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        // Browser will redirect — nothing more to do here
      }
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
      <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-12 lg:px-10">

        {/* Mobile logo */}
        <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <img src={logoUrl} alt="AndamanBazaar" className="h-9 w-9 rounded-xl shadow-sm" />
          <span className="text-lg font-semibold tracking-tight">
            Andaman<span className="text-primary">Bazaar</span>
          </span>
        </Link>

        <div className="w-full max-w-sm mx-auto space-y-6">

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "signup" && "Create your account"}
              {mode === "signin" && "Welcome back"}
              {mode === "forgot" && "Reset your password"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signup" && "Join the island marketplace — it's free."}
              {mode === "signin" && "Sign in to keep selling and chatting."}
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

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" && "Create account"}
              {mode === "signin" && "Sign in"}
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
          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
