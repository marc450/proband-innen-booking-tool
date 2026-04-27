"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function SignupCta({
  label = "Jetzt kostenlos starten",
  size = "default",
  variant = "primary",
}: {
  label?: string;
  /** "hero" makes the button bigger, "default" matches inline CTAs. */
  size?: "default" | "hero";
  /** "inverse" swaps to white bg / blue text for use on the blue CTA banner. */
  variant?: "primary" | "inverse";
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Backend wiring lands in a follow-up alongside the LearnWorlds SSO work
  // (lead capture + auto-enroll + welcome email). Until then, the form
  // submits to nothing and shows a placeholder success state so the page
  // can ship without dead-end UX.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSubmitted(false);
  }

  const padding =
    size === "hero" ? "px-7 py-4 text-base md:text-lg" : "px-6 py-3 text-sm md:text-base";
  const colors =
    variant === "inverse"
      ? "bg-white text-[#0066FF] hover:bg-white/90"
      : "bg-[#0066FF] text-white hover:bg-[#0055DD]";
  const buttonClasses = `inline-block font-bold rounded-[10px] transition-colors ${padding} ${colors}`;

  return (
    <>
      <button type="button" className={buttonClasses} onClick={() => setOpen(true)}>
        {label}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-white sm:max-w-md">
          {submitted ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Vielen Dank, wir melden uns
                </DialogTitle>
                <DialogDescription className="text-black/70 leading-relaxed">
                  Wir prüfen Deine Anmeldung und schicken Dir den Zugang zum kostenlosen Botox-Tutorial in Kürze per E-Mail zu.
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="mt-4 inline-block text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
              >
                Schließen
              </button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold leading-tight">
                  Kostenlosen Botox-Kurs starten
                </DialogTitle>
                <DialogDescription className="text-black/70 leading-relaxed">
                  Trag Deine Daten ein, um den kostenlosen Auszug aus dem Grundkurs Botulinum freizuschalten. Die Anmeldung ist nur für approbierte Ärzt:innen.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-firstName"
                      className="text-sm font-semibold text-black"
                    >
                      Vorname
                    </label>
                    <input
                      id="signup-firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      className="rounded-[10px] bg-[#FAEBE1] px-4 py-3 text-base text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-lastName"
                      className="text-sm font-semibold text-black"
                    >
                      Nachname
                    </label>
                    <input
                      id="signup-lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      className="rounded-[10px] bg-[#FAEBE1] px-4 py-3 text-base text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signup-email"
                    className="text-sm font-semibold text-black"
                  >
                    E-Mail
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="rounded-[10px] bg-[#FAEBE1] px-4 py-3 text-base text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>

                <label className="flex items-start gap-3 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    className="mt-1 h-4 w-4 flex-shrink-0 rounded border-black/20 text-[#0066FF] focus:ring-[#0066FF]"
                  />
                  <span className="text-xs text-black/70 leading-relaxed">
                    Ich akzeptiere die{" "}
                    <a
                      href="/kurse/agb"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0066FF] underline hover:no-underline"
                    >
                      AGB
                    </a>{" "}
                    und die{" "}
                    <a
                      href="/kurse/datenschutz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0066FF] underline hover:no-underline"
                    >
                      Datenschutzerklärung
                    </a>
                    . Ich bestätige, dass ich approbierte:r Ärzt:in bin.
                  </span>
                </label>

                <button
                  type="submit"
                  className="mt-2 inline-block w-full text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3.5 transition-colors"
                >
                  Jetzt kostenlos starten
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
