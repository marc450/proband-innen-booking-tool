"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
import { KeyRound, ChevronDown } from "lucide-react";

const navGroups = [
  {
    label: "Proband:innen",
    items: [
      { href: "/dashboard", label: "Behandlungsangebote", exact: true },
      { href: "/dashboard/bookings", label: "Buchungen" },
      { href: "/dashboard/patients", label: "Proband:innen" },
      { href: "/dashboard/campaigns", label: "Kampagnen", adminOnly: true },
    ],
  },
  {
    label: "Auszubildende",
    items: [
      { href: "/dashboard/auszubildende", label: "Kurstermine", exact: true },
      { href: "/dashboard/auszubildende/buchungen", label: "Buchungen" },
      { href: "/dashboard/auszubildende/personen", label: "Auszubildende" },
    ],
  },
];

const standaloneNavItems = [
  { href: "/dashboard/inbox", label: "Inbox" },
];

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Determine which group is active based on current path
  const isGroupActive = (group: typeof navGroups[0]) =>
    group.items.some((item) =>
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );

  const isItemActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

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

      <header className="bg-white border-b">
        <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo.svg" alt="EPHIA" className="h-6" />
            </Link>
            <nav className="flex items-center gap-4">
              {navGroups.map((group) => (
                <div key={group.label} className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                    onBlur={() => setTimeout(() => setOpenGroup(null), 150)}
                    className={cn(
                      "flex items-center gap-1 text-sm transition-colors",
                      isGroupActive(group)
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {group.label}
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      openGroup === group.label && "rotate-180"
                    )} />
                  </button>
                  {openGroup === group.label && (
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                      {group.items.filter((item) => !item.adminOnly || role === "admin").map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenGroup(null)}
                          className={cn(
                            "block px-4 py-2 text-sm transition-colors",
                            isItemActive(item)
                              ? "text-foreground font-medium bg-gray-50"
                              : "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {standaloneNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm transition-colors",
                    pathname.startsWith(item.href)
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {role === "admin" && (
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    "text-sm transition-colors",
                    pathname.startsWith("/dashboard/settings")
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openPasswordDialog}
              className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Passwort ändern"
            >
              <span className="hidden sm:inline">{userEmail}</span>
              <KeyRound className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
