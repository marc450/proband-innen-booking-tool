import { ExternalLink } from "lucide-react";
import { getAllCourseSlugs, getCourseContent } from "@/content/kurse";

export const dynamic = "force-dynamic";

type PageEntry = {
  title: string;
  path: string;
  note?: string;
};

type PageGroup = {
  label: string;
  description?: string;
  /** Public host for every page in this group, e.g. "https://ephia.de". */
  host: string;
  pages: PageEntry[];
};

// Canonical public hosts for each marketing surface. Links in this
// overview must open on the correct subdomain (NOT on admin.ephia.de),
// otherwise users land on the staff host instead of the marketing site.
const HOST_MARKETING = "https://ephia.de";
const HOST_PROBAND = "https://proband-innen.ephia.de";

const HAUPTSEITEN: PageGroup = {
  label: "Hauptseiten",
  description: "Startseite und allgemeine Marketingseiten auf ephia.de.",
  host: HOST_MARKETING,
  pages: [
    { title: "Startseite", path: "/" },
    { title: "Unsere Kurse", path: "/unsere-kurse" },
    { title: "Curriculum Botulinum", path: "/curriculum-botulinum" },
    { title: "CME-Online-Seminare", path: "/cme-online-seminare" },
    { title: "Unsere Didaktik", path: "/didaktik" },
    { title: "Unsere Vision", path: "/vision" },
    { title: "Unsere Community", path: "/community" },
    { title: "Team & Dozent:innen", path: "/team" },
    { title: "FAQ & Kontakt", path: "/faq-kontakt" },
  ],
};

const BOTOX_LANDINGS: PageGroup = {
  label: "Botox-Performance-Landingpages",
  description:
    "Eigenständige Landingpages für Botox-Suchanfragen. Inhaltlich Botulinum-Curriculum, mit Botox-Wording im Title/Hook.",
  host: HOST_MARKETING,
  pages: [
    { title: "CME-Online-Kurse Botox", path: "/cme-onlinekurse-botox" },
    { title: "Kostenloser Botox-Kurs", path: "/kostenloser-botox-kurs" },
  ],
};

const RECHTLICHES: PageGroup = {
  label: "Rechtliches",
  host: HOST_MARKETING,
  pages: [
    { title: "Impressum", path: "/impressum" },
    { title: "Datenschutz", path: "/datenschutz" },
    { title: "AGB", path: "/agb" },
  ],
};

const SHOP: PageGroup = {
  label: "Shop",
  host: HOST_MARKETING,
  pages: [{ title: "Merch Shop", path: "/merch" }],
};

const FUNNELS: PageGroup = {
  label: "Buchungsfunnels",
  description:
    "Öffentliche Buchungsstrecken für Proband:innen auf proband-innen.ephia.de.",
  host: HOST_PROBAND,
  pages: [
    { title: "Werde Proband:in (Startseite)", path: "/" },
    { title: "Standard Buchung (Proband:innen)", path: "/book" },
    { title: "Privat-Funnel (Empfehlung)", path: "/book/privat" },
  ],
};

function buildCourseGroup(): PageGroup {
  const pages: PageEntry[] = getAllCourseSlugs()
    .map((slug) => {
      const content = getCourseContent(slug);
      const rawTitle = content?.meta.title ?? slug;
      const cleanTitle = rawTitle
        .replace(/\s*\|\s*EPHIA\s*$/i, "")
        .replace(/\s*—\s*EPHIA\s*$/i, "")
        .trim();
      return { title: cleanTitle, path: `/${slug}` };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "de"));
  return {
    label: "Kurs-Landingpages",
    description:
      "Eine Landingpage pro Kursangebot, gerendert über /kurse/[slug] und auf ephia.de unter dem clean Slug ausgespielt.",
    host: HOST_MARKETING,
    pages,
  };
}

export default function LandingPagesPage() {
  const groups: PageGroup[] = [
    HAUPTSEITEN,
    BOTOX_LANDINGS,
    buildCourseGroup(),
    RECHTLICHES,
    SHOP,
    FUNNELS,
  ];

  const total = groups.reduce((sum, g) => sum + g.pages.length, 0);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Landing Pages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Übersicht aller öffentlichen Marketingseiten ({total} Seiten). Klicke
          auf eine Zeile, um die Seite in einem neuen Tab zu öffnen.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.label} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{group.label}</h2>
            {group.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {group.description}
              </p>
            )}
          </div>
          <div className="bg-white rounded-[10px] divide-y divide-gray-100 overflow-hidden shadow-sm">
            {group.pages.map((p) => {
              const fullUrl = `${group.host}${p.path}`;
              const displayUrl = `${group.host.replace(/^https?:\/\//, "")}${p.path}`;
              return (
                <a
                  key={p.path}
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {displayUrl}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
