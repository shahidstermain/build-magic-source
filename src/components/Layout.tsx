import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, PlusSquare, MessageCircle, User, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/listings", label: "Browse", icon: Search },
  { to: "/sell", label: "Sell", icon: PlusSquare },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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
            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                    <AvatarFallback className="bg-muted text-sm font-medium">
                      {(user.user_metadata?.name || user.email || "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {user.user_metadata?.name || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate("/", { replace: true });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Sign in
              </Link>
            )}
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