import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Swatch = {
  name: string;
  hex: string;
  hsl: string;
  use: string;
  fg: "light" | "dark";
};

const SWATCHES: Swatch[] = [
  { name: "Deep Indigo", hex: "#1B2A4E", hsl: "222 49% 21%", use: "Primary surface, trust", fg: "light" },
  { name: "Tide Navy",   hex: "#2C3E6B", hsl: "222 41% 30%", use: "Secondary surface, depth", fg: "light" },
  { name: "Coral Sun",   hex: "#F08A6B", hsl: "13 81% 68%",  use: "Accent, action, warmth",  fg: "dark" },
  { name: "Ember",       hex: "#E55A3C", hsl: "11 76% 57%",  use: "Hover / urgency",          fg: "light" },
  { name: "Lagoon",      hex: "#4FA8B8", hsl: "189 39% 52%", use: "Tertiary, info, calm",     fg: "dark" },
  { name: "Sand",        hex: "#F4E9D8", hsl: "38 60% 90%",  use: "Light surface, breathing", fg: "dark" },
  { name: "Foam",        hex: "#FFFFFF", hsl: "0 0% 100%",   use: "On-color text",            fg: "dark" },
];

const SLANG = [
  { surface: "Home hero",       phrase: "Aaj ka maal full set hai 🐟" },
  { surface: "Browse empty",    phrase: "Abhi yahan kuch nahi… kal boat se aa sakta hai 🚢" },
  { surface: "Chat empty",      phrase: "Bhai chai pe baithte, baat karte 😄" },
  { surface: "Delivery humor",  phrase: "Sab boat pe depend hai 🚢" },
  { surface: "Notifications",   phrase: "Khali inbox, full sukoon 🌴" },
  { surface: "Trust badge",     phrase: "Idhar sab trusted hai" },
];

export default function Brand() {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-[image:var(--gradient-hero)] p-8 text-primary-foreground md:p-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <Badge variant="secondary" className="bg-background/15 text-primary-foreground">
              Brand identity
            </Badge>
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              Tidal Vernacular
            </h1>
            <p className="text-base text-primary-foreground/80 md:text-lg">
              The visual language of AndamanBazaar — hyperlocal, patient, and built on
              <span className="italic"> boat pe bharosa</span>.
            </p>
          </div>
          <img
            src={logo}
            alt="AndamanBazaar logo"
            className="h-32 w-32 rounded-2xl shadow-elevated md:h-40 md:w-40"
          />
        </div>
      </section>

      {/* Logo */}
      <section className="space-y-4">
        <SectionHeader eyebrow="01" title="Logo" />
        <div className="grid gap-4 md:grid-cols-3">
          <LogoTile bg="bg-background" label="On light" textClass="text-foreground" />
          <LogoTile bg="bg-foreground" label="On dark" textClass="text-background" />
          <LogoTile bg="bg-accent" label="On accent" textClass="text-accent-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Min size 32px. Always keep clear space equal to one wave-curl. Never recolor or
          stretch.
        </p>
      </section>

      {/* Color palette */}
      <section className="space-y-4">
        <SectionHeader eyebrow="02" title="Color palette" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map((s) => (
            <Card
              key={s.hex}
              className="overflow-hidden border-border"
            >
              <div
                className="flex h-32 items-end p-3"
                style={{ background: s.hex, color: s.fg === "light" ? "#fff" : "#1B2A4E" }}
              >
                <span className="font-mono text-xs opacity-80">{s.hex}</span>
              </div>
              <div className="space-y-1 p-3">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">hsl({s.hsl})</p>
                <p className="text-xs text-muted-foreground">{s.use}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <SectionHeader eyebrow="03" title="Typography" />
        <div className="grid gap-4 md:grid-cols-3">
          <TypeTile
            specimen="Aa"
            family="Instrument Serif"
            role="Display · wordmark · editorial"
            cls="font-serif"
          />
          <TypeTile
            specimen="Aa"
            family="Outfit / system"
            role="UI · body · controls"
            cls="font-sans font-semibold"
          />
          <TypeTile
            specimen="01"
            family="Geist Mono / system mono"
            role="Numerals · ETAs · ferry hops"
            cls="font-mono"
          />
        </div>
      </section>

      {/* Voice */}
      <section className="space-y-4">
        <SectionHeader eyebrow="04" title="Voice & slang" />
        <Card className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <VoiceRule heading="Do" tone="success">
              <li>Sprinkle slang at 10–20% — never flood.</li>
              <li>Rotate phrases per surface so it stays fresh.</li>
              <li>Stay warm, patient, hyperlocal: island time.</li>
            </VoiceRule>
            <VoiceRule heading="Don't" tone="destructive">
              <li>No slang in payments, errors, or auth.</li>
              <li>No forced humor in destructive flows.</li>
              <li>No translating Hinglish into English in-line.</li>
            </VoiceRule>
          </div>
          <div className="space-y-2 rounded-xl bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tagline
            </p>
            <p className="font-serif text-2xl">boat pe bharosa rakho.</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Phrase samples
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {SLANG.map((s) => (
                <li key={s.surface} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.surface}
                  </span>
                  <span className="text-sm">{s.phrase}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* Footer link */}
      <section className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Need the social media kit? Ask in chat — banners, profile pictures, and the full
        brand poster are bundled as a download.{" "}
        <Link to="/" className="font-medium text-primary hover:underline">
          Back to home →
        </Link>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border pb-2">
      <span className="font-mono text-xs text-muted-foreground">{eyebrow}</span>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function LogoTile({
  bg,
  label,
  textClass,
}: {
  bg: string;
  label: string;
  textClass: string;
}) {
  return (
    <Card className={`flex items-center gap-4 border-border p-6 ${bg}`}>
      <img src={logo} alt="" className="h-16 w-16 rounded-xl" />
      <div className={textClass}>
        <p className="font-serif text-xl">AndamanBazaar</p>
        <p className="font-mono text-[11px] uppercase tracking-wider opacity-70">{label}</p>
      </div>
    </Card>
  );
}

function TypeTile({
  specimen,
  family,
  role,
  cls,
}: {
  specimen: string;
  family: string;
  role: string;
  cls: string;
}) {
  return (
    <Card className="space-y-3 p-6">
      <p className={`text-7xl leading-none text-foreground ${cls}`}>{specimen}</p>
      <div>
        <p className="text-sm font-semibold">{family}</p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {role}
        </p>
      </div>
    </Card>
  );
}

function VoiceRule({
  heading,
  tone,
  children,
}: {
  heading: string;
  tone: "success" | "destructive";
  children: React.ReactNode;
}) {
  const dot = tone === "success" ? "bg-success" : "bg-destructive";
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <p className="text-sm font-semibold">{heading}</p>
      </div>
      <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
        {children}
      </ul>
    </div>
  );
}
