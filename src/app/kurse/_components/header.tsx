"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";

type SubLink = {
  label: string;
  href: string;
  // When true the entry shows in the dropdown but is not clickable.
  // Used for curricula that don't have landing pages yet.
  disabled?: boolean;
};

type NavLink = {
  label: string;
  href: string;
  subLinks?: SubLink[];
};

const NAV_LINKS: NavLink[] = [
  {
    label: "Unsere Kurse",
    href: "/kurse/unsere-kurse",
    subLinks: [
      { label: "Einzelkurse", href: "/kurse/unsere-kurse" },
      { label: "Curriculum Botulinum", href: "#", disabled: true },
      { label: "Curriculum Dermalfiller", href: "#", disabled: true },
      { label: "Curriculum Hautpflege", href: "#", disabled: true },
    ],
  },
  {
    label: "Über EPHIA",
    href: "https://www.ephia.de/ueber-ephia",
    subLinks: [
      { label: "Unsere Vision", href: "/kurse/vision" },
      { label: "Unser Team", href: "/kurse/team" },
      { label: "Unsere Community", href: "/kurse/community" },
      { label: "Unsere Didaktik", href: "/kurse/didaktik" },
    ],
  },
  { label: "EPHIA Journal", href: "https://www.ephia.de/blog" },
  { label: "Werde Proband:in", href: "https://proband-innen.ephia.de/" },
  { label: "Merch ✨", href: "/merch" },
  { label: "FAQ & Kontakt", href: "/kurse/faq-kontakt" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const toggleMobileSection = (label: string) => {
    setMobileExpanded((current) => (current === label ? null : label));
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAEBE1]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo always points at the marketing home. Uses an absolute
              kurse.ephia.de URL so visitors on proband-innen.ephia.de
              (where this header is rendered for the werde-proband-in
              page) are bounced back to the marketing site instead of
              staying on the booking funnel. */}
          <Link
            href="https://kurse.ephia.de/"
            className="flex items-center shrink-0"
            aria-label="EPHIA"
          >
            <Image
              src="/logos/ephia-logo.png"
              alt="EPHIA"
              width={2394}
              height={589}
              priority
              quality={95}
              sizes="220px"
              className="h-8 md:h-9 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) =>
              link.subLinks ? (
                <div key={link.label} className="relative group">
                  {/* Parent of a dropdown is not a link — only the sub-items
                      navigate. Rendered as a span (kept buttonless so the
                      hover chevron rotation from the group: selector still
                      works cleanly). */}
                  <span
                    className="flex items-center gap-1 text-base font-normal text-black group-hover:text-[#0066FF] transition-colors py-2 cursor-default select-none"
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180"
                      strokeWidth={2.25}
                    />
                  </span>
                  {/* Invisible bridge to avoid hover gap */}
                  <div className="absolute left-0 right-0 top-full h-3" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5rem)] min-w-[240px] bg-white rounded-[10px] shadow-lg py-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
                    {link.subLinks.map((sub) =>
                      sub.disabled ? (
                        <span
                          key={sub.label}
                          className="block px-5 py-2.5 text-base font-normal text-black/40 cursor-not-allowed select-none"
                          aria-disabled="true"
                        >
                          {sub.label}
                        </span>
                      ) : (
                        <a
                          key={sub.label}
                          href={sub.href}
                          className="block px-5 py-2.5 text-base font-normal text-black hover:text-[#0066FF] hover:bg-[#FAEBE1]/60 transition-colors"
                        >
                          {sub.label}
                        </a>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 text-base font-normal text-black hover:text-[#0066FF] transition-colors"
                >
                  <span>{link.label}</span>
                </a>
              ),
            )}
            <a
              href="https://www.ephia.de/home"
              className="text-sm font-semibold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-2.5 transition-colors"
            >
              Login
            </a>
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 -mr-2 text-black"
            aria-label="Menü"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-black/5 bg-[#FAEBE1]">
          <nav className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) =>
              link.subLinks ? (
                <div key={link.label} className="border-b border-black/5">
                  <button
                    type="button"
                    onClick={() => toggleMobileSection(link.label)}
                    className="flex items-center justify-between w-full text-base font-medium text-black py-3"
                  >
                    <span>{link.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        mobileExpanded === link.label ? "rotate-180" : ""
                      }`}
                      strokeWidth={2.25}
                    />
                  </button>
                  {mobileExpanded === link.label && (
                    <div className="pb-3 pl-4 flex flex-col gap-1">
                      {link.subLinks.map((sub) =>
                        sub.disabled ? (
                          <span
                            key={sub.label}
                            className="block py-2 text-sm font-medium text-black/40 cursor-not-allowed select-none"
                            aria-disabled="true"
                          >
                            {sub.label}
                          </span>
                        ) : (
                          <a
                            key={sub.label}
                            href={sub.href}
                            className="block py-2 text-sm font-medium text-black/80"
                            onClick={() => setMobileOpen(false)}
                          >
                            {sub.label}
                          </a>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between text-base font-medium text-black py-3 border-b border-black/5"
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{link.label}</span>
                </a>
              ),
            )}
            <a
              href="https://www.ephia.de/home"
              className="mt-3 text-center text-base font-semibold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
            >
              Login
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
