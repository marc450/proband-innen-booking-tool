"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  KeyRound,
  LogOut,
  Users,
  Mail,
  Moon,
  Sun,
  Receipt,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  ShoppingBag,
  Globe,
  LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
  /**
   * When true, allow users with `is_kursbetreuung = true` to see this
   * item even if it's `adminOnly`. Used to grant kursbetreuung access
   * to specific items inside otherwise admin-only groups (e.g. the
   * shared customerlove inbox).
   */
  kursbetreuungAllowed?: boolean;
  /** Restrict this item to a specific list of user emails (lowercase). */
  emailAllowlist?: string[];
};

type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  adminOnly?: boolean;
  /** Restrict the whole group to a specific list of user emails (lowercase). */
  emailAllowlist?: string[];
};

const LEADERSHIP_EMAILS = ["sophia@ephia.de", "marc@ephia.de"];

const navGroups: NavGroup[] = [
  {
    key: "contacts",
    label: "Kontakte",
    icon: Users,
    items: [
      {
        href: "/dashboard/auszubildende/personen?type=auszubildende",
        label: "Ärzt:innen",
      },
      { href: "/dashboard/patients", label: "Proband:innen" },
      {
        href: "/dashboard/auszubildende/personen?type=other",
        label: "Sonstige",
      },
    ],
  },
  {
    key: "bookings",
    label: "Buchungen",
    icon: Receipt,
    items: [
      { href: "/dashboard/auszubildende/buchungen", label: "Ärzt:innen" },
      { href: "/dashboard/bookings", label: "Proband:innen" },
    ],
  },
  {
    key: "termine",
    label: "Termine",
    icon: CalendarDays,
    items: [
      { href: "/dashboard/auszubildende", label: "Kurstermine", exact: true },
      { href: "/dashboard/behandlungstermine", label: "Behandlungstermine" },
    ],
  },
  {
    key: "emails",
    label: "E-Mails",
    icon: Mail,
    // Visibility decided per-item: kursbetreuung users see only the
    // shared customerlove Inbox; Kampagnen and Transaktional stay
    // admin-only. Nutzer:innen without kursbetreuung see no items and
    // therefore no group icon.
    items: [
      {
        href: "/dashboard/inbox",
        label: "Inbox",
        adminOnly: true,
        kursbetreuungAllowed: true,
      },
      { href: "/dashboard/campaigns", label: "Kampagnen", adminOnly: true },
      { href: "/dashboard/email-templates", label: "Vorlagen", adminOnly: true },
      { href: "/dashboard/transactional-emails", label: "Transaktional", adminOnly: true },
    ],
  },
  {
    key: "pages",
    label: "Pages",
    icon: Globe,
    items: [
      { href: "/dashboard/landingpages", label: "Landing Pages" },
    ],
  },
  {
    key: "merch",
    label: "Merch",
    icon: ShoppingBag,
    adminOnly: true,
    items: [
      { href: "/dashboard/merch/produkte", label: "Produkte" },
      { href: "/dashboard/merch/bestellungen", label: "Bestellungen" },
    ],
  },
  {
    key: "leadership",
    label: "Dashboard",
    icon: TrendingUp,
    adminOnly: true,
    emailAllowlist: LEADERSHIP_EMAILS,
    items: [
      { href: "/dashboard/umsatzpotenzial", label: "Umsatzpotenzial" },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    icon: ShieldCheck,
    adminOnly: true,
    items: [
      { href: "/dashboard/settings?tab=kurstermine", label: "Kurstermine" },
      { href: "/dashboard/settings?tab=kursangebot", label: "Kurse" },
      { href: "/dashboard/settings?tab=rabattcodes", label: "Rabattcodes" },
      { href: "/dashboard/settings?tab=einladungen", label: "Einladungen" },
      { href: "/dashboard/settings?tab=rechnungen", label: "Zahlungsverläufe" },
      { href: "/dashboard/settings?tab=benutzer", label: "Benutzer:innen" },
      { href: "/dashboard/zertifikate", label: "Zertifikatgenerator" },
    ],
  },
];

const HOVER_DELAY_MS = 150;

export function DashboardNav({
  userEmail,
  role,
  isKursbetreuung = false,
  theme = "light",
}: {
  userEmail: string;
  role: "admin" | "nutzer";
  isKursbetreuung?: boolean;
  theme?: "light" | "dark";
}) {
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(theme);

  const toggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    document.cookie = `x-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    const root = document.querySelector("[data-dashboard-root]");
    if (root) {
      root.classList.toggle("dark", next === "dark");
    }
    router.refresh();
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Unread email indicator (admins + kursbetreuung users see the inbox).
  const [hasUnread, setHasUnread] = useState(false);
  useEffect(() => {
    if (role !== "admin" && !isKursbetreuung) return;
    const checkUnread = async () => {
      try {
        const res = await fetch("/api/gmail/threads?maxResults=1&q=is:unread");
        if (!res.ok) return;
        const data = await res.json();
        setHasUnread((data.threads?.length || 0) > 0);
      } catch {
        // silently ignore
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 60_000);
    return () => clearInterval(interval);
  }, [role, isKursbetreuung]);

  const currentEmailLower = (userEmail || "").toLowerCase();
  const emailAllowed = (list?: string[]) => !list || list.includes(currentEmailLower);

  const isItemVisible = (item: NavItem) => {
    if (!emailAllowed(item.emailAllowlist)) return false;
    if (!item.adminOnly) return true;
    if (role === "admin") return true;
    if (item.kursbetreuungAllowed && isKursbetreuung) return true;
    return false;
  };

  const visibleGroups = navGroups.filter((g) => {
    if (!emailAllowed(g.emailAllowlist)) return false;
    if (g.adminOnly && role !== "admin") return false;
    // Hide groups that have no items the current user can actually
    // see — avoids dead group icons when every child is admin-only.
    return g.items.some(isItemVisible);
  });

  const isItemActive = (item: NavItem) => {
    // Split path and query so we can compare both parts. Two nav entries may
    // point to the same path with different ?type= values (e.g. Kontakte >
    // Auszubildende vs Sonstige), in which case we must match on the query
    // string too to avoid both rows lighting up.
    const [pathOnly, queryString] = item.href.split("?");
    const pathMatches = item.exact
      ? pathname === pathOnly
      : pathname.startsWith(pathOnly);
    if (!pathMatches) return false;
    if (!queryString) return true;
    const required = new URLSearchParams(queryString);
    for (const [key, value] of required) {
      if (searchParams?.get(key) !== value) return false;
    }
    return true;
  };

  const isGroupActive = (group: NavGroup) =>
    group.items.filter(isItemVisible).some(isItemActive);

  const handleEnter = (key: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredGroup(key), HOVER_DELAY_MS);
  };
  const handleLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredGroup(null), HOVER_DELAY_MS);
  };

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const openPasswordDialog = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswordDialog(true);
    setUserMenuOpen(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
    }
  };

  const initials = (userEmail || "")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Password change dialog */}
      <Dialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          if (!open) setShowPasswordDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>

          {passwordSuccess ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm font-medium">Passwort erfolgreich geändert.</p>
              <p className="text-sm text-muted-foreground">
                Beim nächsten Login verwendest Du das neue Passwort.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Neues Passwort</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Passwort bestätigen</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Passwort wiederholen"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              {passwordSuccess ? "Schließen" : "Abbrechen"}
            </Button>
            {!passwordSuccess && (
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? "Speichern..." : "Passwort setzen"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 z-40"
      >
        {/* Logo */}
        <Link href="/dashboard" className="mb-4 flex items-center justify-center h-10 w-10">
          <img src="/favicon.svg" alt="EPHIA" className="h-7 w-7 object-contain" />
        </Link>

        {/* Nav icons */}
        <nav className="flex flex-col gap-1 flex-1 w-full items-center">
          {visibleGroups.map((group) => {
            const Icon = group.icon;
            const active = isGroupActive(group);
            const items = group.items.filter(isItemVisible);
            const isSingle = items.length === 1;
            const firstHref = items[0]?.href;

            return (
              <div
                key={group.key}
                className="relative"
                onMouseEnter={() => handleEnter(group.key)}
                onMouseLeave={handleLeave}
              >
                {isSingle ? (
                  <Link
                    href={firstHref}
                    className={cn(
                      "relative flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      active
                        ? "bg-black/10 text-foreground"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    )}
                    title={group.label}
                  >
                    <Icon className="h-5 w-5" />
                    {group.key === "emails" && hasUnread && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#0066FF] rounded-full border-2 border-[var(--sidebar)]" />
                    )}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "relative flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      active
                        ? "bg-black/10 text-foreground"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    )}
                    title={group.label}
                  >
                    <Icon className="h-5 w-5" />
                    {group.key === "emails" && hasUnread && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#0066FF] rounded-full border-2 border-[var(--sidebar)]" />
                    )}
                  </button>
                )}

                {/* Flyout */}
                {hoveredGroup === group.key && !isSingle && (
                  <div
                    className="absolute left-full top-0 ml-1 bg-white border rounded-lg shadow-lg py-1 min-w-[200px]"
                    onMouseEnter={() => handleEnter(group.key)}
                    onMouseLeave={handleLeave}
                  >
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </div>
                    {items.map((item) => {
                      const itemActive = isItemActive(item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setHoveredGroup(null)}
                          className={cn(
                            "block px-4 py-2 text-sm transition-colors",
                            itemActive
                              ? "text-foreground font-medium bg-gray-50"
                              : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User avatar / menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className={cn(
              "h-9 w-9 rounded-full bg-[#0066FF] text-white text-xs font-semibold flex items-center justify-center transition-opacity",
              userMenuOpen ? "opacity-100" : "opacity-90 hover:opacity-100"
            )}
            title={userEmail}
          >
            {initials || "EP"}
          </button>

          {userMenuOpen && (
            <div className="absolute left-full bottom-0 ml-1 bg-white border rounded-lg shadow-lg py-1 min-w-[220px] z-50">
              <div className="px-4 py-2 border-b">
                <p className="text-xs text-muted-foreground">Angemeldet als</p>
                <p className="text-sm font-medium truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
              >
                {currentTheme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Helles Design
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Dunkles Design
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={openPasswordDialog}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                Passwort ändern
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Abmelden
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
