import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Home, Search, PlusSquare, MessageCircle, User,
  LogOut, LayoutDashboard, Heart, Sparkles, Mail, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.png";

const tabs = [
  { to: "/",        label: "Home",    icon: Home,          end: true },
  { to: "/listings",label: "Browse",  icon: Search },
  { to: "/sell",    label: "Sell",    icon: PlusSquare },
  { to: "/chats",   label: "Chats",   icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src={logoUrl} alt="AndamanBazaar" className="h-8 w-8 rounded-lg object-cover" />
            <span className="hidden text-base font-semibold tracking-tight sm:block">
              Andaman<span className="text-primary">Bazaar</span>
            </span>
          </Link>

          {/* Desktop nav pills */}
          <div className="ml-4 hidden items-center gap-1 md:flex">
            <NavPill to="/listings?category=experiences">🌊 Experiences</NavPill>
            <NavPill to="/trip-planner">
              <Wand2 className="h-3.5 w-3.5" /> AI Planner
            </NavPill>
          </div>

          {/* Search pill — desktop */}
          <Link
            to="/listings"
            className="mx-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            Search the islands…
          </Link>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/sell"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 active:scale-95"
            >
              + Post
            </Link>

            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full outline-none ring-2 ring-transparent focus-visible:ring-ring">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {(user.user_metadata?.name || user.email || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate text-xs text-muted-foreground font-normal">
                      {user.user_metadata?.name || user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/favorites")}>
                      <Heart className="mr-2 h-4 w-4" /> Saved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-trips")}>
                      <Sparkles className="mr-2 h-4 w-4" /> My trips
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/contact")}>
                      <Mail className="mr-2 h-4 w-4" /> Contact us
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:pb-10">
        <Outlet />
      </main>

      {/* ── Desktop footer ─────────────────────────────────────────────────── */}
      <footer className="mx-auto hidden max-w-6xl px-4 pb-8 pt-4 text-xs text-muted-foreground md:block">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p>© {new Date().getFullYear()} AndamanBazaar · Port Blair, A&N Islands</p>
          <ul className="flex flex-wrap items-center gap-4">
            {[
              { to: "/contact", label: "Contact" },
              { to: "/privacy",  label: "Privacy" },
              { to: "/terms",    label: "Terms" },
              { to: "/brand",    label: "Brand" },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="transition-colors hover:text-foreground">{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </footer>

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg md:hidden">
        <ul className="mx-auto flex max-w-6xl items-stretch">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn(
                      "grid h-7 w-7 place-items-center rounded-xl transition-colors",
                      isActive ? "bg-primary/10" : "",
                    )}>
                      <Icon className="h-5 w-5" />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function NavPill({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
