import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/listings", label: "Browse", icon: Search },
  { to: "/sell", label: "Sell", icon: PlusSquare },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

export function Layout() {
  const location = useLocation();
  const hideChrome = ["/auth", "/reset-password"].some((p) => location.pathname.startsWith(p));

  if (hideChrome) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-hero)] text-primary-foreground font-bold">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Andaman<span className="text-primary">Bazaar</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/listings"
              className="hidden rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted sm:inline-flex"
            >
              Search the islands…
            </Link>
            <Link
              to="/sell"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground shadow-sm hover:opacity-90"
            >
              + Post
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-6xl items-stretch justify-around">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}