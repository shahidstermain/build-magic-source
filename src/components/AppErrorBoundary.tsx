import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

const MODULE_IMPORT_ERROR = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Load failed/i;
const RELOAD_KEY = "andamanbazaar-module-import-reload";

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error", error, info);

    if (!MODULE_IMPORT_ERROR.test(error.message)) return;

    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    const now = Date.now();

    if (now - lastReload > 10_000) {
      sessionStorage.setItem(RELOAD_KEY, String(now));
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The app could not load the latest page module. Refresh to try again.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh page</Button>
        </div>
      </main>
    );
  }
}