import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Mail,
  Link2,
  TrendingUp,
  Brain,
  Plane,
  Sparkles,
  DollarSign,
  CreditCard,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AdminLink = {
  to: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ADMIN_LINKS: AdminLink[] = [
  { to: "/admin/blog", label: "Blog posts", description: "Manage stories, news & guides", icon: BookOpen },
  { to: "/admin/release-notes", label: "Release notes", description: "Publish what's new updates", icon: Sparkles },
  { to: "/admin/emails", label: "Email logs", description: "Resend deliverability & history", icon: Mail },
  { to: "/admin/affiliates", label: "Affiliates", description: "Vendors, clicks & conversions", icon: Link2 },
  { to: "/admin/affiliate-revenue", label: "Affiliate revenue", description: "Per-link earnings & flags", icon: TrendingUp },
  { to: "/admin/knowledge", label: "Knowledge base", description: "Curate trip-planner facts", icon: Brain },
  { to: "/admin/trip-leads", label: "Trip leads", description: "Inbound trip-planner enquiries", icon: Plane },
  { to: "/admin/price-qa", label: "Price QA", description: "Audit AI-suggested pricing", icon: DollarSign },
  { to: "/payment-test", label: "Payment test", description: "Cashfree sandbox checklist", icon: CreditCard },
];

export function AdminToolsCard() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">Admin tools</h2>
        <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">
          Admin only
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_LINKS.map(({ to, label, description, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex h-full items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
