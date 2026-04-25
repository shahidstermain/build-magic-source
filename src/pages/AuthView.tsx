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
import { Loader2 } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);
const nameSchema = z.string().trim().min(2, "Tell us your name").max(80);

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

  useEffect(() => {
    if (!loading && session) navigate("/", { replace: true });
  }, [loading, session, navigate]);

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
        toast({ title: "Welcome back" });
        navigate("/", { replace: true });
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
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      // If redirected, browser is already navigating away.
      if (!result.redirected) navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast({ title: "Google sign-in failed", description: message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[image:var(--gradient-hero)] font-bold text-primary-foreground">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Andaman<span className="text-primary">Bazaar</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signup" && "Create your account"}
            {mode === "signin" && "Welcome back"}
            {mode === "forgot" && "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" && "Buy, sell and chat with islanders nearby."}
            {mode === "signin" && "Sign in to keep selling and chatting."}
            {mode === "forgot" && "We'll email you a link to reset your password."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={onGoogle}
            disabled={busy}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.4 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.48 0 9.1-3.84 9.1-9.26 0-.62-.07-1.1-.16-1.54H12z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or use your email
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
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
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline">Terms</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
};

export default AuthView;