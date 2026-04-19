"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PrerequisiteConfirmationDialogProps {
  open: boolean;
  /** Heading shown in the dialog. Defaults to a generic title. */
  title?: string;
  /** Body text shown above the checkbox. */
  description: string;
  /** Label for the confirmation checkbox. */
  checkboxLabel: string;
  /** Confirm button label. Defaults to "Bestätigen & weiter". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Fired only after the user has ticked the checkbox and clicked Confirm. */
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic prerequisite confirmation modal — opens before a booking flow
 * to make the user explicitly acknowledge that they meet a hard
 * prerequisite (e.g. having completed a specific Onlinekurs). The
 * Confirm button stays disabled until the checkbox is ticked.
 *
 * Currently used on the Masterclass Botulinum Praxiskurs to require an
 * explicit confirmation that the Onlinekurs Periorale Zone has been
 * completed before kicking off the Stripe checkout.
 */
export function PrerequisiteConfirmationDialog({
  open,
  title = "Voraussetzung bestätigen",
  description,
  checkboxLabel,
  confirmLabel = "Bestätigen & weiter zur Buchung",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}: PrerequisiteConfirmationDialogProps) {
  const [checked, setChecked] = useState(false);

  // Reset the checkbox whenever the dialog re-opens so the user is
  // forced to actively confirm each time, not just inherit a previous
  // tick from an earlier booking attempt.
  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className="w-5 h-5 text-amber-600"
              aria-hidden="true"
            />
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-black/80 leading-relaxed">{description}</p>

        <label className="flex items-start gap-3 cursor-pointer select-none mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[#0066FF]"
          />
          <span className="text-sm text-black leading-snug">{checkboxLabel}</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={!checked}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
