"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-accent-foreground",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-all duration-200 lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
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
        <div className="flex-1 px-3 py-4">
          <NavLinks collapsed={collapsed} />
        </div>
        <div className="border-t p-3">
          <ThemeToggle compact={collapsed} />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-card">
            <div className="flex h-16 items-center justify-between border-b px-4">
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
            <div className="flex-1 px-3 py-4">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t p-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      <div className={cn("transition-all duration-200", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 lg:hidden">
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
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
