"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

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
 * Styled to match the kurse landing pages: white background (overrides
 * the global rose `--background`), brand-blue CTA, generous spacing
 * and Roboto typography inherited from the site.
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
      <DialogContent
        showCloseButton={false}
        className="!bg-white sm:max-w-md p-0 gap-0 ring-0 shadow-2xl rounded-[10px] overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-black tracking-tight">
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-7 pt-3 pb-6 space-y-5">
          <p className="text-[15px] text-black/75 leading-relaxed">
            {description}
          </p>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-[18px] w-[18px] flex-shrink-0 cursor-pointer accent-[#0066FF]"
            />
            <span className="text-[15px] text-black leading-snug">
              {checkboxLabel}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-black/[0.08] bg-black/[0.015]">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-black/70 hover:text-black px-4 py-2.5 rounded-[10px] cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!checked}
            className="text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] disabled:bg-black/15 disabled:text-black/40 disabled:cursor-not-allowed px-5 py-2.5 rounded-[10px] cursor-pointer transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
