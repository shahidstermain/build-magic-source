import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Home, Search, PlusSquare, MessageCircle, User,
  LogOut, LayoutDashboard, Heart, Sparkles, Mail, Wand2, Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { PromoBanner } from "@/components/PromoBanner";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.webp";

const tabs = [
  { to: "/",         label: "Home",    icon: Home,          end: true },
  { to: "/listings", label: "Browse",  icon: Search },
  { to: "/sell",     label: "Sell",    icon: PlusSquare },
  { to: "/chats",    label: "Chats",   icon: MessageCircle },
  { to: "/profile",  label: "Profile", icon: User },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const hideChrome = ["/auth", "/reset-password"].some((p) => location.pathname.startsWith(p));

  // ── Affiliate UTM return tracking ────────────────────────────────────────
  // If a shopper returns to the site with `?ab_click=<id>&ab_amount=<inr>&ab_order=<ext>`,
  // record a soft (pending) conversion and strip those params from the URL.
  useEffect(() => {
    const clickId = searchParams.get("ab_click");
    if (!clickId) return;
    const amountParam = searchParams.get("ab_amount");
    const externalOrderId = searchParams.get("ab_order");
    const amount_inr = amountParam ? Number(amountParam) : null;

    // Dedupe across reloads using sessionStorage
    const dedupeKey = `ab_utm_${clickId}_${externalOrderId ?? ""}`;
    if (sessionStorage.getItem(dedupeKey)) {
      // already recorded — just strip params
    } else {
      sessionStorage.setItem(dedupeKey, "1");
      supabase.functions
        .invoke("affiliate-utm-return", {
          body: {
            click_id: clickId,
            external_order_id: externalOrderId,
            amount_inr,
          },
        })
        .catch((err) => console.warn("affiliate-utm-return failed", err));
    }

    // Strip ab_* params so they don't pollute analytics or sharing
    const next = new URLSearchParams(searchParams);
    next.delete("ab_click");
    next.delete("ab_amount");
    next.delete("ab_order");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (hideChrome) return <Outlet />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Launch promo banner ───────────────────────────────────────────── */}
      <PromoBanner />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
            <div className="relative">
              <img
                src={logoUrl}
                alt="AndamanBazaar"
                width={32}
                height={32}
                decoding="async"
                className="h-8 w-8 rounded-xl object-cover shadow-sm transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-xl ring-2 ring-primary/0 transition-all group-hover:ring-primary/20" />
            </div>
            <span className="hidden text-[15px] font-bold tracking-tight sm:block">
              Andaman<span className="text-primary">Bazaar</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-3 hidden items-center gap-0.5 md:flex">
            <HeaderNavLink to="/listings?category=experiences">
              <Waves className="h-3.5 w-3.5" /> Experiences
            </HeaderNavLink>
            <HeaderNavLink to="/trip-planner">
              <Wand2 className="h-3.5 w-3.5" /> AI Planner
            </HeaderNavLink>
            <HeaderNavLink to="/blog">📰 Blog</HeaderNavLink>
            <HeaderNavLink to="/pricing">💎 Pricing</HeaderNavLink>
          </nav>

          {/* Search bar — desktop */}
          <Link
            to="/listings"
            className="mx-auto hidden max-w-sm flex-1 items-center gap-2.5 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground shadow-[var(--shadow-xs)] transition-all hover:border-primary/30 hover:bg-muted hover:shadow-[var(--shadow-card)] md:flex"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span>Search the islands…</span>
          </Link>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/sell"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-accent)] transition-all hover:opacity-90 hover:shadow-none active:scale-95"
            >
              + Post
            </Link>

            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full outline-none">
                    <Avatar className="h-8 w-8 border-2 border-border transition-all hover:border-primary/40">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-bold text-primary">
                        {(user.user_metadata?.name || user.email || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-[var(--shadow-elevated)]">
                    <DropdownMenuLabel className="truncate px-2 py-1.5 text-xs text-muted-foreground font-normal">
                      {user.user_metadata?.name || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1" />
                    {[
                      { icon: User,          label: "Profile",    to: "/profile" },
                      { icon: Heart,         label: "Saved",      to: "/favorites" },
                      { icon: LayoutDashboard,label: "Dashboard", to: "/dashboard" },
                      { icon: Sparkles,      label: "My trips",   to: "/my-trips" },
                      { icon: Mail,          label: "Contact",    to: "/contact" },
                    ].map(({ icon: Icon, label, to }) => (
                      <DropdownMenuItem
                        key={to}
                        onClick={() => navigate(to)}
                        className="cursor-pointer rounded-xl px-2 py-2"
                      >
                        <Icon className="mr-2.5 h-4 w-4 text-muted-foreground" /> {label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-xl px-2 py-2 text-destructive focus:text-destructive"
                      onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
                    >
                      <LogOut className="mr-2.5 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:pb-12">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="hidden border-t border-border/50 bg-muted/30 md:block">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src={logoUrl} alt="" className="h-6 w-6 rounded-lg opacity-70" />
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} AndamanBazaar · Port Blair, A&N Islands
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-5">
              {[
                { to: "/contact", label: "Contact" },
                { to: "/privacy", label: "Privacy" },
                { to: "/terms",   label: "Terms" },
                { to: "/brand",   label: "Brand" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>

      {/* ── Mobile bottom nav ──────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        {/* Frosted glass bar */}
        <div className="border-t border-border/40 bg-background/90 backdrop-blur-xl">
          <ul className="mx-auto flex max-w-6xl">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/70",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn(
                        "relative grid h-7 w-7 place-items-center rounded-2xl transition-all duration-200",
                        isActive
                          ? "bg-primary/12 text-primary scale-110"
                          : "text-muted-foreground/70",
                      )}>
                        <Icon className="h-[18px] w-[18px]" />
                        {isActive && (
                          <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className={isActive ? "text-primary" : ""}>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}

function HeaderNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-primary/8 hover:text-primary"
    >
      {children}
    </Link>
  );
}
