import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Twitter,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().min(3, "Add a short subject").max(150),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a bit more (min 10 characters)")
    .max(4000, "Message is too long"),
});

const SUPPORT_EMAIL = "support@andamanbazaar.in";
const WHATSAPP_NUMBER = "+91 8217041965";
const WHATSAPP_LINK = "https://wa.me/918217041965";
const ADDRESS = "Port Blair, South Andaman, A&N Islands – 744101";
const HOURS = "Mon–Sat · 9 AM – 6 PM IST";

const SOCIALS = [
  { icon: Instagram, label: "@andamanbazaar", href: "https://instagram.com/andamanbazaar" },
  { icon: Facebook, label: "facebook.com/andamanbazaar", href: "https://facebook.com/andamanbazaar" },
  { icon: Twitter, label: "@andamanbazaar", href: "https://twitter.com/andamanbazaar" },
];

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof form;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-message", {
        body: parsed.data,
      });
      if (error) throw error;
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast({
        title: "Message sent",
        description: "We'll get back to you within 1–2 working days.",
      });
    } catch (err) {
      console.error("contact submit failed", err);
      toast({
        title: "Couldn't send message",
        description:
          "Something went wrong. You can also email us directly at " + SUPPORT_EMAIL,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Get in touch</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Questions, feedback, or partnership ideas? The AndamanBazaar team is based in
          Port Blair and ready to help — usually within a working day.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        {/* Contact details */}
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold">Reach us directly</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <ContactRow icon={Mail} label="Email">
                <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </ContactRow>
              <ContactRow icon={MessageSquare} label="WhatsApp">
                <a
                  className="text-primary hover:underline"
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {WHATSAPP_NUMBER}
                </a>
              </ContactRow>
              <ContactRow icon={Phone} label="Phone">
                <a className="text-primary hover:underline" href="tel:+918217041965">
                  {WHATSAPP_NUMBER}
                </a>
              </ContactRow>
              <ContactRow icon={MapPin} label="Office">
                <span className="text-foreground">{ADDRESS}</span>
              </ContactRow>
              <ContactRow icon={Clock} label="Hours">
                <span className="text-foreground">{HOURS}</span>
              </ContactRow>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold">Follow the islands</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <li key={href} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Looking for help with a listing? You can also message the seller directly from any
            listing page, or visit the{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              dashboard
            </Link>
            .
          </p>
        </section>

        {/* Contact form */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold">Send us a message</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Goes straight to {SUPPORT_EMAIL}. We'll reply to the email you provide.
          </p>

          {sent ? (
            <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-medium text-foreground">Thanks — message received!</p>
              <p className="mt-1 text-muted-foreground">
                We've also sent a confirmation to your email. Expect a reply within 1–2
                working days.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setSent(false)}
              >
                Send another
              </Button>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              <Field label="Your name" htmlFor="name" error={errors.name}>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Priya from Havelock"
                  maxLength={100}
                  autoComplete="name"
                  disabled={submitting}
                />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                  autoComplete="email"
                  disabled={submitting}
                />
              </Field>
              <Field label="Subject" htmlFor="subject" error={errors.subject}>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  placeholder="Question about a listing"
                  maxLength={150}
                  disabled={submitting}
                />
              </Field>
              <Field label="Message" htmlFor="message" error={errors.message}>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  rows={6}
                  maxLength={4000}
                  disabled={submitting}
                />
              </Field>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send message
                  </>
                )}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 break-words text-sm">{children}</div>
      </div>
    </li>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export default Contact;