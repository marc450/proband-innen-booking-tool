"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, User, Building2, Loader2 } from "lucide-react";
import type { PatientStatus } from "@/lib/types";

type ContactType = "auszubildende" | "proband" | "other" | "company";
type AzubiStatus = "active" | "inactive";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ContactType | null;
  /** Called after a successful create. The parent typically calls router.refresh(). */
  onCreated?: (result: { id: string; type: ContactType }) => void;
}

const TYPE_OPTIONS: Array<{
  value: ContactType;
  label: string;
  description: string;
  icon: typeof Stethoscope;
}> = [
  {
    value: "auszubildende",
    label: "Ärzt:in",
    description: "Auszubildende:r in einem EPHIA-Kurs",
    icon: Stethoscope,
  },
  {
    value: "proband",
    label: "Proband:in",
    description: "Patient:in für Behandlungstermine",
    icon: User,
  },
  {
    value: "other",
    label: "Sonstige",
    description: "Firma oder sonstiger Kontakt",
    icon: Building2,
  },
];

const AZUBI_STATUS_OPTIONS: Array<{ value: AzubiStatus; label: string }> = [
  { value: "active", label: "Aktiv" },
  { value: "inactive", label: "Inaktiv" },
];

const PATIENT_STATUS_OPTIONS: Array<{ value: PatientStatus; label: string }> = [
  { value: "active", label: "Aktiv" },
  { value: "warning", label: "Warnung" },
  { value: "blacklist", label: "Blacklist" },
  { value: "inactive", label: "Inaktiv" },
];

export function NewContactModal({
  open,
  onOpenChange,
  defaultType = null,
  onCreated,
}: Props) {
  const router = useRouter();
  const [type, setType] = useState<ContactType | null>(defaultType);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isFirma, setIsFirma] = useState(false);
  const [status, setStatus] = useState<string>("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setTitle("");
      setSpecialty("");
      setCompanyName("");
      setIsFirma(false);
      setStatus("active");
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultType]);

  const statusOptions =
    type === "proband" ? PATIENT_STATUS_OPTIONS : AZUBI_STATUS_OPTIONS;

  const handleSubmit = async () => {
    if (!type) return;
    setError(null);
    if (!firstName.trim() || !email.trim()) {
      setError("Vorname und E-Mail sind Pflichtfelder.");
      return;
    }
    setSubmitting(true);
    try {
      const effectiveType: ContactType =
        type === "other" && isFirma ? "company" : type;
      const res = await fetch("/api/admin/create-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: effectiveType,
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || null,
          status,
          title: title || null,
          specialty: specialty || null,
          companyName: companyName || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Fehler beim Speichern");
        setSubmitting(false);
        return;
      }
      onCreated?.({ id: json.id, type: effectiveType });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Kontakt</DialogTitle>
          {!type && (
            <DialogDescription>
              Wähle zuerst, um welche Art Kontakt es sich handelt.
            </DialogDescription>
          )}
        </DialogHeader>

        {!type ? (
          <div className="grid gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className="flex items-start gap-3 rounded-[10px] bg-[#FAEBE1] hover:bg-[#F4DCC9] p-4 text-left transition-colors"
                >
                  <Icon className="w-5 h-5 mt-0.5 text-[#733D29] flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setType(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Anderen Typ wählen
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nachname</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {type === "auszubildende" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    placeholder="Dr., Prof., …"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="specialty">Fachrichtung</Label>
                  <Input
                    id="specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
              </div>
            )}

            {type === "other" && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isFirma}
                    onChange={(e) => setIsFirma(e.target.checked)}
                  />
                  Ist eine Firma
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Firmenname</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">
                {error}
              </div>
            )}
          </div>
        )}

        {type && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kontakt anlegen
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
