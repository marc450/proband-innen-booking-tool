import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CERTIFICATE_TEMPLATES,
  certificateRequiresVnr,
  getCertificateForBooking,
} from "@/lib/certificates";
import { CertificateTestForm, type CourseTypeOption } from "./certificate-test-form";

export const dynamic = "force-dynamic";

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ZertifikatgeneratorPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  // Pull every course session joined with its template. We then group
  // sessions per registered cert so the form can present a two-step
  // course-type → date picker. A session that supports both human and
  // dentist certs (the Botulinum case) shows up in both groups, but
  // each group resolves to its own cert template + VNR semantics.
  const supabase = createAdminClient();
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select(
      `id, date_iso, label_de, vnr_praxis,
       course_templates:template_id ( course_key, course_label_de, title, vnr_theorie )`,
    )
    .order("date_iso", { ascending: true });

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

  const sessionRows = (sessions ?? []) as unknown as SessionRow[];

  const courseTypes: CourseTypeOption[] = [];
  for (const cert of CERTIFICATE_TEMPLATES) {
    const matchingSessions = sessionRows
      .filter((s) => {
        const tmpl = pickOne(s.course_templates);
        if (!tmpl?.course_key) return false;
        const resolved = getCertificateForBooking({
          sessionCourseKey: tmpl.course_key,
          // Force the resolver into the dentist branch when this cert
          // is the dentist variant; otherwise stay on the regular path.
          audienceTag: cert.isDentist ? "Zahnmediziner:in" : null,
          specialty: null,
        });
        return resolved?.slug === cert.slug;
      })
      .map((s) => {
        const tmpl = pickOne(s.course_templates)!;
        return {
          id: s.id,
          dateIso: s.date_iso,
          labelDe: s.label_de || tmpl.course_label_de || tmpl.title || "Kurs",
          courseLabel: tmpl.course_label_de || tmpl.title || cert.label,
          vnrTheorie: tmpl.vnr_theorie || "",
          vnrPraxis: s.vnr_praxis || "",
        };
      });

    if (matchingSessions.length === 0) continue;

    courseTypes.push({
      certSlug: cert.slug,
      certLabel: cert.label,
      requiresVnr: certificateRequiresVnr(cert),
      sessions: matchingSessions,
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Zertifikatgenerator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wähle Kurs und Kurstermin. VNR Theorie und VNR Praxis werden
          automatisch geladen. Reine Onlinekurse werden aktuell noch
          nicht unterstützt, das kommt später.
        </p>
      </div>

      {courseTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-white rounded-[10px] p-6 shadow-sm ring-1 ring-black/5">
          Keine zertifizierbaren Kurstermine gefunden. Stelle sicher,
          dass mindestens eine Kursvorlage einen Zertifikatstyp im
          Registry hat (z.B. Grundkurs Botulinum) und dass Kurstermine
          dafür angelegt sind.
        </p>
      ) : (
        <CertificateTestForm courseTypes={courseTypes} />
      )}
    </div>
  );
}
