-- 084_lms_vielfalt_lesson.sql
-- Add the third lesson in chapter 2: "Vielfalt in der ästhetischen
-- Medizin". Long text-only lesson with a signal-callout intro
-- ("highlight blue box" per the source), three H3 sections, a closing
-- summaryBand, an H2 + citation-variant orderedList for the
-- Literaturverzeichnis (10 entries; entry 9 is a book without DOI).
--
-- Two em-dashes in the prose were replaced with commas per brand
-- rule. Number ranges (2-4 Tagen, 80 Einheiten, 25- bis 34-Jährige)
-- preserve their hyphens since they're not punctuation dashes.
-- Order index 2 → third lesson in the chapter (after Lernziele = 0,
-- Diskriminierung = 1).

BEGIN;

WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'vielfalt-in-der-aesthetischen-medizin',
  'Vielfalt in der ästhetischen Medizin',
  'text',
  440,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "callout",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "Die Wirksamkeit und das Ansprechen auf Botulinum können je nach Alter, ethnischer Zugehörigkeit und Geschlecht der Patient:innen erheblich variieren. Diese Unterschiede resultieren aus anatomischen, physiologischen und kulturellen Faktoren, die die Behandlungsergebnisse beeinflussen können. Studien zeigen, dass beispielsweise Männer aufgrund einer stärkeren und voluminöseren mimischen Muskulatur in der Regel höhere Dosierungen benötigen als Frauen, um vergleichbare Ergebnisse zu erzielen (10). Ebenso weisen Personen mit dunklerer Haut häufig eine dichtere Hautstruktur und Unterschiede in der Fettverteilung auf, die sich auf die Diffusion und Effizienz von Botulinum auswirken können." }] }
        ]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Das Alter spielt ebenfalls eine entscheidende Rolle: Ältere Patient:innen zeigen durch altersbedingte Atrophien in der Muskulatur und Haut sowie eine veränderte Dermisstruktur oft eine andere Dynamik im Ansprechen auf Botulinum. Neben diesen physiologischen Unterschieden beeinflussen auch psychosoziale und kulturelle Aspekte, wie Schönheitsideale und Behandlungserwartungen, die Wahrnehmung und das gewünschte Ergebnis der Behandlungen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In diesem Kapitel erfährst Du, wie diese Faktoren bei der Beratung und Behandlung mit Botulinum zu berücksichtigen sind." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Geschlechtsspezifische Unterschiede bei Botulinum-Behandlungen" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Die Muskelmasse variiert stark zwischen Männern und Frauen, was sich auch in der ästhetischen Medizin zeigt. In den letzten Jahren ist die Anzahl der Männer, die Botulinum verwenden, deutlich gestiegen. Obwohl die ästhetische Verwendung von Botulinum seit fast 20 Jahren von der FDA zugelassen ist, gibt es nur wenige Studien, die sich mit geschlechtsspezifischen Unterschieden in Dosierung, Wirksamkeit und Sicherheit des Toxins befassen. Vorhandene Studien zeigen jedoch, dass Männer in der Regel höhere Dosen benötigen, um die gleichen klinischen Ergebnisse wie Frauen zu erzielen (1, 2, 10)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Männer haben eine signifikant größere Menge an Skelett- und auch mimischer Muskulatur, was zu einer stärkeren Faltenbildung führt. Zudem weisen sie eine dünnere Fettschicht im Gesicht auf. Diese anatomischen Unterschiede tragen dazu bei, dass Männer höhere Botulinum-Dosen benötigen, da sie mehr Toxinrezeptoren haben, die gebunden werden müssen (2). Zudem zeigt sich, dass Frauen tendenziell schneller auf die Behandlung reagieren, mit einer Reaktionszeit von 2-4 Tagen im Vergleich zu 2-5 Tagen bei Männern (3)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In der Praxis benötigen Männer oft doppelt so viele Einheiten für die gleiche Wirkung. Zum Beispiel können Männer bis zu 80 Einheiten OnabotulinumtoxinA für die Behandlung der Glabellafalten benötigen, während Frauen typischerweise 20-35 Einheiten verwenden (4)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Interessanterweise zeigen Studien, dass die Wirkung bei Frauen im Durchschnitt 3-5 Monate anhält, während sie bei Männern 4-6 Monate dauern kann (4). Dieser Unterschied könnte auf höhere Dosen bei Männern oder kleine Stichprobengrößen in den Studien zurückzuführen sein, erfordert jedoch weitere Forschung und lässt sich nicht immer nach unserer Erfahrung in der klinischen Anwendung belegen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Du merkst bestimmt, dass wir in diesem Text über Männer und Frauen schreiben. Das liegt unter anderem daran, dass in der Wissenschaft bislang kaum Studien vorliegen, die andere Geschlechter einbeziehen und kennzeichnen. Daher übernehmen wir hier die Ergebnisse, wie sie in der Literatur verzeichnet wurden. Bitte bedenke aber auch, dass Personen in Transition durch Hormontherapie eher männlich oder weiblich gelesene Merkmale entwickeln können (z. Bsp. Zunahme der Muskelmasse unter Testosteron-Therapie). Bitte passe Deine Therapie entsprechend daran an." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Botulinum im Alter: Weniger ist mehr" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Obwohl Botulinum in den USA offiziell für Patient:innen im Alter von 18 bis 65 Jahren zugelassen ist, wird es häufig auch bei Patient:innen über 65 Jahren eingesetzt, trotz fehlender spezifischer Richtlinien. Mit dem Alter treten signifikante Veränderungen an der neuromuskulären Verbindung auf, darunter ein fortschreitender Verlust von Muskelmasse und -kraft sowie eine Verschlechterung der Nervenfunktion(5). Bei älteren Patient:innen verlangsamt sich der Erholungsprozess nach der Behandlung durch Botulinum, was zu einer langsameren Wiederherstellung der Muskelfunktion führt." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Es gibt nur begrenzte Studien, die Unterschiede in der Reaktion älterer Patient:innen auf Botulinum im Vergleich zu jüngeren untersuchen. Aufgrund dünnerer Haut, Muskelatrophie und statischen Falten durch Schwerkraft scheint Botulinum bei älteren Patient:innen weniger effektiv zu sein (5). Außerdem ist bei der Behandlung Vorsicht geboten: Zu hohe Dosen können ein übermäßiges Herabsinken der Stirn und Augenbrauen verursachen, was das Sehvermögen beeinträchtigen kann. Bei älteren Patient:innen sollten daher niedrige Dosierungen, präzise Injektionstechniken und konservative Ansätze gewählt werden, um Komplikationen wie Ptosis zu vermeiden und die Patient:innensicherheit zu gewährleisten(6)." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Ethnische Unterschiede in der Wirkung und Anwendung von Botulinum" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Vergleiche ästhetischer Ergebnisse nach der Anwendung von Botulinum zwischen verschiedenen ethnischen Gruppen sind in der Literatur bislang kaum dokumentiert. Mit einer immer diverseren Patient:innenpopulation wird es jedoch immer wichtiger, diese Unterschiede zu erkennen. Studien legen nahe, dass genetische Unterschiede in der Haut, wie etwa die Dichte der Toxinrezeptoren, zu variierenden Reaktionen auf Botulinum führen könnten (7)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "People of Color (PoC) haben oft weniger feine Linien, Falten und Sonnenschäden als hellhäutige Personen. Asiatische Haut weist in der Regel eine dickere Dermis, mehr Kollagen und eine festere Bindung an das darunterliegende Gewebe auf, was zu weniger Faltenbildung und Hauterschlaffung führt(8,9)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Allerdings tritt bei Asiat:innen häufig eine Masseterhypertrophie auf, die durch Zähneknirschen und Kieferanspannung verursacht wird. Botulinum-Injektionen in den Massetermuskel sind hier ein effektives Mittel zur Konturierung des unteren Gesichts und helfen, eine jugendlichere Gesichtsform wiederherzustellen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Studien zeigen, dass PoC-Patient:innen eine stärkere Reaktion auf AbobotulinumtoxinA haben als weiße Patient:innen. Ein Konsens zur Behandlung asiatischer Patient:innen empfiehlt eine konservative Dosierung bei bestimmten Behandlungsbereichen, wie der Glabellafalte und der perioralen Region(8)." }]
      },
      {
        "type": "summaryBand",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "Nach diesem Kapitel weiß ich, dass ..." }] },
          { "type": "paragraph", "content": [{ "type": "text", "text": "Hier findest Du eine Zusammenfassung mit den wichtigsten Punkten aus diesem Kapitel:" }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Männer in der Regel höhere Dosen von Botulinum benötigen als Frauen, da sie über eine größere Muskelmasse im Gesicht verfügen. Zudem ist ihre Hautstruktur anders, was zu stärkeren Falten führt. Frauen reagieren schneller auf die Behandlung, aber Männer profitieren oft länger von den Ergebnissen. Bitte beachte besondere Therapieansätze bei Personen in/nach Transition." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "bei Patient:innen über 65 Jahren die Wirkung von Botulinum aufgrund von altersbedingten Veränderungen, wie Muskelatrophie und dünnerer Haut, langsamer und weniger effektiv sein kann. Bei älteren Patient:innen sind niedrigere Dosen und präzise Injektionstechniken entscheidend, um Komplikationen wie Ptosis zu vermeiden." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Unterschiede in der Hautstruktur, wie Dicke und Elastizität, die Wirkung von Botulinum bei verschiedenen ethnischen Gruppen beeinflussen kann. Asiatische Patient:innen haben tendenziell weniger feine Linien, leiden aber häufiger an Masseterhypertrophie. PoC-Patient:innen zeigen möglicherweise eine stärkere Reaktion auf bestimmte Botulinum-Produkte und erfordern daher eine angepasste Dosierung." }] }] }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Literaturverzeichnis" }]
      },
      {
        "type": "orderedList",
        "attrs": { "variant": "citations" },
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Schlessinger J, Monheit G, Kane MA, Mendelsohn N. Time to onset of response of abobotulinumtoxina in the treatment of glabellar lines: a subset analysis of phase 3 clinical trials of a new botulinum toxin type A. Dermatol Surg. 2011 Oct;37(10):1434-42. doi: 10.1111/j.1524-4725.2011.02075.x. Epub 2011 Jul 11. PMID: 21745254. " },
                  { "type": "text", "text": "https://doi.org/10.1111/j.1524-4725.2011.02075.x", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/j.1524-4725.2011.02075.x" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Keaney TC, Alster TS. Botulinum toxin in men: review of relevant anatomy and clinical trial data. Dermatol Surg. 2013 Oct;39(10):1434-43. doi: 10.1111/dsu.12302. PMID: 24090254. " },
                  { "type": "text", "text": "https://doi.org/10.1111/dsu.12302", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/dsu.12302" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Rappl T, Parvizi D, Friedl H, Wiedner M, May S, Kranzelbinder B, Wurzer P, Hellbom B. Onset and duration of effect of incobotulinumtoxinA, onabotulinumtoxinA, and abobotulinumtoxinA in the treatment of glabellar frown lines: a randomized, double-blind study. Clin Cosmet Investig Dermatol. 2013 Sep 24;6:211-9. doi: 10.2147/CCID.S41537. PMID: 24098087; PMCID: PMC3789632. " },
                  { "type": "text", "text": "https://doi.org/10.2147/CCID.S41537", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.2147/CCID.S41537" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Flynn TC. Botox in men. Dermatol Ther. 2007 Nov-Dec;20(6):407-13. doi: 10.1111/j.1529-8019.2007.00156.x. PMID: 18093014. " },
                  { "type": "text", "text": "https://doi.org/10.1111/j.1529-8019.2007.00156.x", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/j.1529-8019.2007.00156.x" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Courtney J, Steinbach JH. Age changes in neuromuscular junction morphology and acetylcholine receptor distribution on rat skeletal muscle fibres. J Physiol. 1981 Nov;320:435-47. doi: 10.1113/jphysiol.1981.sp013960. PMID: 7320945; PMCID: PMC1244058. " },
                  { "type": "text", "text": "https://doi.org/10.1113/jphysiol.1981.sp013960", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1113/jphysiol.1981.sp013960" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Yamauchi PS. Selection and preference for botulinum toxins in the management of photoaging and facial lines: patient and physician considerations. Patient Prefer Adherence. 2010 Sep 7;4:345-54. doi: 10.2147/ppa.s6494. PMID: 20859461; PMCID: PMC2943226. " },
                  { "type": "text", "text": "https://doi.org/10.2147/ppa.s6494", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.2147/ppa.s6494" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Taylor SC, Callender VD, Albright CD, Coleman J, Axford-Gatley RA, Lin X. AbobotulinumtoxinA for reduction of glabellar lines in patients with skin of color: post hoc analysis of pooled clinical trial data. Dermatol Surg. 2012 Nov;38(11):1804-11. doi: 10.1111/j.1524-4725.2012.02551.x. Epub 2012 Aug 28. PMID: 22928999. " },
                  { "type": "text", "text": "https://doi.org/10.1111/j.1524-4725.2012.02551.x", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/j.1524-4725.2012.02551.x" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Wesley NO, Maibach HI. Racial (ethnic) differences in skin properties: the objective data. Am J Clin Dermatol. 2003;4(12):843-60. doi: 10.2165/00128071-200304120-00004. PMID: 14640777. " },
                  { "type": "text", "text": "https://doi.org/10.2165/00128071-200304120-00004", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.2165/00128071-200304120-00004" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Barel, A. O., Paye, M., & Maibach, H. I. (Eds.). (2014). Handbook of cosmetic science and technology. CRC press." }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Kandhari R, Imran A, Sethi N, Rahman E, Mosahebi A. Onabotulinumtoxin Type A Dosage for Upper Face Expression Lines in Males: A Systematic Review of Current Recommendations. Aesthet Surg J. 2021 Nov 12;41(12):1439-1453. doi: 10.1093/asj/sjab015. PMID: 33532814. " },
                  { "type": "text", "text": "https://doi.org/10.1093/asj/sjab015", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1093/asj/sjab015" } }] }
                ]
              }
            ]
          }
        ]
      }
    ]
  }$json$::jsonb,
  2,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
