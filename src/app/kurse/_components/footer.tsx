import Image from "next/image";

const FOOTER_LINKS = [
  { label: "Impressum", href: "https://www.ephia.de/impressum" },
  { label: "AGB", href: "https://www.ephia.de/terms" },
  { label: "Datenschutz", href: "https://www.ephia.de/privacy" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#FAEBE1] pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col items-center gap-8">
        <Image
          src="/logos/ephia-logo-centered.png"
          alt="EPHIA"
          width={1225}
          height={537}
          quality={95}
          sizes="160px"
          className="h-12 w-auto"
        />

        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-black/70 hover:text-[#0066FF] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="text-xs text-black/50">© {year} EPHIA. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  );
}
