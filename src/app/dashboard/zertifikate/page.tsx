import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  certificateRequiresVnr,
  getCertificateForBooking,
} from "@/lib/certificates";
import { CertificateTestForm, type EligibleSession } from "./certificate-test-form";

export const dynamic = "force-dynamic";

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ZertifikatgeneratorPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  // Pull every course session joined with its template so we can resolve
  // the cert variants per audience. Sorted newest-first so the dropdown
  // defaults to the most recent course date — that's the one staff
  // typically need to issue a manual cert for.
  const supabase = createAdminClient();
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select(
      `id, date_iso, label_de, vnr_praxis,
       course_templates:template_id ( course_key, course_label_de, title, vnr_theorie )`,
    )
    .order("date_iso", { ascending: false });

  type EmbeddedTemplate = {
    course_key: string | null;
    course_label_de: string | null;
    title: string | null;
    vnr_theorie: string | null;
  };

  type SessionRow = {
    id: string;
    date_iso: string;
    label_de: string | null;
    vnr_praxis: string | null;
    course_templates: EmbeddedTemplate | EmbeddedTemplate[] | null;
  };

  const eligible: EligibleSession[] = [];
  for (const s of (sessions ?? []) as unknown as SessionRow[]) {
    const tmpl = pickOne(s.course_templates);
    if (!tmpl?.course_key) continue;
    const human = getCertificateForBooking({
      sessionCourseKey: tmpl.course_key,
      audienceTag: null,
      specialty: null,
    });
    const zahn = getCertificateForBooking({
      sessionCourseKey: tmpl.course_key,
      audienceTag: "Zahnmediziner:in",
      specialty: null,
    });
    const variants: EligibleSession["variants"] = {};
    if (human && !human.isDentist) {
      variants.humanmedizin = {
        slug: human.slug,
        label: human.label,
        requiresVnr: certificateRequiresVnr(human),
      };
    }
    if (zahn?.isDentist) {
      variants.zahnmedizin = {
        slug: zahn.slug,
        label: zahn.label,
        requiresVnr: certificateRequiresVnr(zahn),
      };
    }
    if (!variants.humanmedizin && !variants.zahnmedizin) continue;
    eligible.push({
      id: s.id,
      dateIso: s.date_iso,
      labelDe: s.label_de || tmpl.course_label_de || tmpl.title || "Kurs",
      courseLabel: tmpl.course_label_de || tmpl.title || "Kurs",
      vnrTheorie: tmpl.vnr_theorie || "",
      vnrPraxis: s.vnr_praxis || "",
      variants,
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Zertifikatgenerator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wähle einen Kurstermin. VNR Theorie und VNR Praxis werden
          automatisch aus dem Termin geladen, sind aber überschreibbar.
          Reine Onlinekurse werden aktuell noch nicht unterstützt, das
          kommt später.
        </p>
      </div>

      {eligible.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-white rounded-[10px] p-6 shadow-sm ring-1 ring-black/5">
          Keine zertifizierbaren Kurstermine gefunden. Stelle sicher,
          dass mindestens eine Kursvorlage einen Zertifikatstyp im
          Registry hat (z.B. Grundkurs Botulinum).
        </p>
      ) : (
        <CertificateTestForm sessions={eligible} />
      )}
    </div>
  );
}
