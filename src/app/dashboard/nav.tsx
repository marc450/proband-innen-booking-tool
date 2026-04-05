"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  GraduationCap,
  Inbox,
  Settings,
  LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  adminOnly?: boolean;
};

const navGroups: NavGroup[] = [
  {
    key: "proband",
    label: "Proband:innen",
    icon: Users,
    items: [
      { href: "/dashboard", label: "Behandlungsangebote", exact: true },
      { href: "/dashboard/bookings", label: "Buchungen" },
      { href: "/dashboard/patients", label: "Proband:innen" },
      { href: "/dashboard/campaigns", label: "Kampagnen", adminOnly: true },
    ],
  },
  {
    key: "auszubildende",
    label: "Auszubildende",
    icon: GraduationCap,
    items: [
      { href: "/dashboard/auszubildende", label: "Kurstermine", exact: true },
      { href: "/dashboard/auszubildende/buchungen", label: "Buchungen" },
      { href: "/dashboard/auszubildende/personen", label: "Auszubildende" },
    ],
  },
  {
    key: "inbox",
    label: "Inbox",
    icon: Inbox,
    items: [{ href: "/dashboard/inbox", label: "Inbox", exact: false }],
  },
  {
    key: "admin",
    label: "Admin",
    icon: Settings,
    adminOnly: true,
    items: [
      { href: "/dashboard/settings?tab=kurstermine", label: "Kurstermine" },
      { href: "/dashboard/settings?tab=kursangebot", label: "Kurse" },
      { href: "/dashboard/settings?tab=rabattcodes", label: "Rabattcodes" },
      { href: "/dashboard/settings?tab=rechnungen", label: "Rechnungen" },
      { href: "/dashboard/settings?tab=benutzer", label: "Benutzer:innen" },
    ],
  },
];

const HOVER_DELAY_MS = 150;

export function DashboardNav({
  userEmail,
  role,
}: {
  userEmail: string;
  role: "admin" | "nutzer";
}) {
  const pathname = usePathname();
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

  const visibleGroups = navGroups.filter((g) => !g.adminOnly || role === "admin");

  const isItemActive = (item: NavItem) => {
    const pathOnly = item.href.split("?")[0];
    return item.exact ? pathname === pathOnly : pathname.startsWith(pathOnly);
  };

  const isGroupActive = (group: NavGroup) =>
    group.items
      .filter((i) => !i.adminOnly || role === "admin")
      .some(isItemActive);

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
        className="fixed top-0 left-0 bottom-0 w-14 bg-[#FAEBE1] border-r border-black/10 flex flex-col items-center py-3 z-40"
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
            const items = group.items.filter((i) => !i.adminOnly || role === "admin");
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
                      "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      active
                        ? "bg-black/10 text-foreground"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    )}
                    title={group.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-center h-10 w-10 rounded-lg transition-colors",
                      active
                        ? "bg-black/10 text-foreground"
                        : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                    )}
                    title={group.label}
                  >
                    <Icon className="h-5 w-5" />
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
