"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/users", label: "Users", icon: Users },
  { href: "/conversations", label: "Conversations", icon: MessageSquareText },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
];

function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-12 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:h-10",
              active && "bg-accent text-accent-foreground",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("w-full", compact ? "px-0" : "justify-start")}
      title={compact ? "Logout" : undefined}
      onClick={() => {
        clearAuthToken();
        router.replace("/login");
      }}
    >
      <LogOut className="h-4 w-4" />
      {!compact && <span>Logout</span>}
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const mobileDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = mobileDialog.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const wideScreen = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (wideScreen.matches) setMobileOpen(false); };
    wideScreen.addEventListener("change", closeOnDesktop);
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      wideScreen.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileOpen]);

  if (pathname === "/login") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-all duration-200 lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold">Vishwavrinda</div>
              <div className="text-xs text-muted-foreground">Ayurveda</div>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <NavLinks collapsed={collapsed} />
        </div>
        <div className="shrink-0 border-t p-3">
          <div className="space-y-2">
            <ThemeToggle compact={collapsed} />
            <LogoutButton compact={collapsed} />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <dialog ref={mobileDialog} aria-label="Navigation" onCancel={() => setMobileOpen(false)}
          className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-card pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
              <div>
                <div className="text-sm font-semibold">Vishwavrinda</div>
                <div className="text-xs text-muted-foreground">Ayurveda</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="shrink-0 border-t p-3">
              <div className="space-y-2">
                <ThemeToggle />
                <LogoutButton />
              </div>
            </div>
          </div>
        </dialog>
      )}

      <div className={cn("transition-all duration-200", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header className="mobile-header sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="text-sm font-semibold">Vishwavrinda Ayurveda</div>
          <ThemeToggle compact />
        </header>
        <main className="app-main mx-auto min-w-0 w-full max-w-none py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
