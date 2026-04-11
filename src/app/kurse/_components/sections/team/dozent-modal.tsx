"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { Dozent, CurriculumItem } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";

interface DozentModalProps {
  dozent: Dozent | null;
  onClose: () => void;
}

/**
 * Full-screen modal showing a Dozent:in's detailed curriculum.
 *
 * Reuses the same overlay + body-scroll-lock pattern as the group
 * inquiry dialog for visual consistency.
 */
export function DozentModal({ dozent, onClose }: DozentModalProps) {
  useEffect(() => {
    if (!dozent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [dozent, onClose]);

  if (!dozent) return null;

  const curriculum = dozent.curriculum;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dozent-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white rounded-[10px] shadow-2xl my-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-black/5 text-black/60 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with portrait + name */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-7 p-6 md:p-10 md:pb-6">
          {dozent.imagePath && (
            <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-full overflow-hidden bg-black/5">
              <Image
                src={dozent.imagePath}
                alt={dozent.imageAlt ?? dozent.name}
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2
              id="dozent-modal-title"
              className={`${TYPO.h3} text-black`}
            >
              {dozent.name}
            </h2>
            <p className="mt-1 text-sm md:text-base font-medium text-[#0066FF]">
              {dozent.role}
            </p>
            {curriculum?.tagline && (
              <p className={`${TYPO.bodyCard} mt-3`}>{curriculum.tagline}</p>
            )}
          </div>
        </div>

        {/* Curriculum body */}
        <div className="px-6 md:px-10 pb-8 md:pb-10">
          {curriculum ? (
            <div className="flex flex-col gap-7 md:gap-9 mt-2">
              {curriculum.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-base md:text-lg font-bold text-black mb-2 tracking-wide">
                    {section.heading}
                  </h3>
                  {section.intro && (
                    <p className={`${TYPO.bodyCard} mb-3`}>{section.intro}</p>
                  )}
                  {section.items && section.items.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {section.items.map((item, i) => (
                        <CurriculumRow key={i} item={item} />
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className={`${TYPO.bodyCard} mt-2`}>{dozent.shortBio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CurriculumRow({ item }: { item: CurriculumItem }) {
  if (typeof item === "string") {
    return (
      <li className="flex gap-2.5 text-sm md:text-base text-black/75 leading-relaxed">
        <span
          aria-hidden="true"
          className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0"
        />
        <span>{item}</span>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5">
      <span className="text-sm md:text-base font-semibold text-black">
        {item.label}
      </span>
      <ul className="flex flex-col gap-1.5 pl-1">
        {item.items.map((sub, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-sm md:text-base text-black/75 leading-relaxed"
          >
            <span
              aria-hidden="true"
              className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0"
            />
            <span>{sub}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
