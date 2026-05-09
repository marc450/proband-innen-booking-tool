-- 087_lms_glabella_treatment_lesson.sql
-- Add the second lesson in chapter 3: "Behandlung der Glabella". A
-- long anatomy + injection-technique lesson with seven captioned
-- figures (Abb. 1 - Abb. 7) interleaved between paragraphs, a small
-- "Legende" subsection, a closing summaryBand and one citation.
--
-- Renderer support added in src/lib/lms/renderer.tsx for the new
-- `figure` node type (next/image inside <figure> with optional
-- "Abb. N" label + caption).
--
-- Image assets: bucket `lms-images` on Supabase Storage, public.
-- Filenames hardcoded in this migration:
--   glabella-1-insertion-amanda.jpg
--   glabella-2-kraftvektoren-amanda.jpg
--   glabella-3-mcs-lydia.jpg
--   glabella-4-mp-lydia.jpg
--   glabella-5-mds-lydia.jpg
--   glabella-6-3punkte-amanda.jpg
--   glabella-7-7punkte-lydia.jpg

BEGIN;

WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'behandlung-der-glabella'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'behandlung-der-glabella',
  'Behandlung der Glabella',
  'text',
  455,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In unserem Lehrvideo zeigen wir die Behandlung der Glabella an einer unserer Patient:innen. Diese Zone wird häufig eingesetzt, um Zornesfalten zu reduzieren oder einen sanften Brow Lift zu erzielen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Auch im Rahmen einer Kopfschmerztherapie kann die Glabella behandelt werden. Wie genau das funktioniert, erfährst Du in unserem EPHIA Aufbaukurs Botulinum: Therapeutische Indikationen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Denke stets an die anatomischen Gegebenheiten: Nur der Stirnmuskel (Musculus frontalis) ist für die Hebung der Augenbraue verantwortlich. Daher ist es sinnvoll, die Glabella mit in die Behandlung einzubeziehen, wenn Du horizontale Stirnfalten adressieren möchtest. Das kann das Empfinden eines Schweregefühls der Augenbrauen deutlich verringern." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-1-insertion-amanda.jpg",
          "alt": "Insertion der Glabella in den Musculus frontalis, dargestellt an Amanda",
          "label": "Abb. 1",
          "caption": "Insertion der Glabella in den M. Frontalis, dargestellt an Amanda"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Die Glabella wird durch mehrere Muskelgruppen gebildet: Den Musculus corrugator supercilii (MCS), den Musculus procerus (MP) und den Musculus depressor supercilii (MDS). Mehr Details zu diesen Muskeln findest Du in unserem Anatomiekapitel in unserem online Grundkurs Botulinum. Wie Du im Video sehen kannst, ermöglicht Dir die sichtbare Kontraktur der Muskulatur, die Injektionspunkte präzise zu bestimmen. Um das zu verdeutlichen, haben wir Dir die empfohlenen Injektionspunkte in einer Grafik dargestellt. Alle Muskeln der Glabella ziehen vom Knochen zum SMAS (superfizielles muskuloaponeurotisches System). Wie Du weißt, unterscheidet sich die mimische Muskulatur des Gesichts in ihrer Struktur und Funktion von der Skelettmuskulatur. Besonders die Verteilung der motorischen Endplatten (MEPs) ist hier entscheidend: Während diese bei der Skelettmuskulatur zentral liegen, sind sie bei der mimischen Muskulatur oft exzentrisch angeordnet. Viele Muskelfasern besitzen zudem mehrere Endplatten, was eine feine neuronale Steuerung ermöglicht." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-2-kraftvektoren-amanda.jpg",
          "alt": "Kraftvektoren des Musculus corrugator supercilii und des Musculus depressor supercilii, dargestellt an Amanda",
          "label": "Abb. 2",
          "caption": "Kraftvektoren der MCS und MDS, dargestellt an Amanda"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Dieses Wissen nutzen wir gezielt in der Behandlung mit Botulinum. Studien deuten darauf hin, dass MEPs besonders im Bereich der Muskelursprünge konzentriert sind (1). Daher sollte das Botulinum möglichst in diesen Regionen appliziert werden, um die bestmögliche Wirkung zu erzielen. Im Video erklären wir Dir anhand von Kraftvektoren (Abb. 2), wie Du das Botulinum optimal platzierst: Entlang der Richtung der Kraftentwicklung erzielst Du die beste Wirksamkeit." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-3-mcs-lydia.jpg",
          "alt": "Schematische Darstellung des Musculus corrugator supercilii, dargestellt an Lydia",
          "label": "Abb. 3",
          "caption": "Schematische Darstellung des MCS, dargestellt an Lydia"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Botulinum wird bei der Behandlung der Glabella-Region gezielt in die Hauptmuskeln injiziert: Den Musculus corrugator supercilii (Abb. 3), den Musculus procerus (Abb. 4) und optional in den Musculus depressor supercilii (Abb. 5)." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-4-mp-lydia.jpg",
          "alt": "Schematische Darstellung des Musculus procerus, dargestellt an Lydia",
          "label": "Abb. 4",
          "caption": "Schematische Darstellung MP, dargestellt an Lydia"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Bei der Behandlung der Glabella wirst Du feststellen, dass die Ausprägungen der einzelnen Muskeln individuell variieren können und sich die Muskeln nicht immer klar voneinander abgrenzen lassen. Indem Du Dich an der spezifischen Muskelbewegung orientierst und den Bereich mit der höchsten Kraftausübung behandelst, kannst Du auch bei anatomischen Besonderheiten überzeugende Ergebnisse erzielen. Vermeide es daher, starr nach festen Schemata vorzugehen, und passe Deine Behandlung an die individuelle Anatomie Deiner Patient:innen an." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-5-mds-lydia.jpg",
          "alt": "Schematische Darstellung des Musculus depressor supercilii, dargestellt an Lydia",
          "label": "Abb. 5",
          "caption": "Schematische Darstellung MDS, dargestellt an Lydia"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In der Regel wählt man 3-5 Injektionspunkte: Ein bis zwei Punkte pro Seite im Bereich des Musculus corrugator supercilii und einen zentralen Punkt im Musculus procerus. Die Platzierung der Injektionen sollte entsprechend der individuellen Muskelkontraktur erfolgen, die durch vorherige mimische Bewegungen gut sichtbar wird. Wir zeigen Dir in den Lehrvideos das korrekte Einzeichnen. Achte darauf, dass die Punkte nahe an der Augenbraue gewählt werden. Je höher Du das Botulinum platzierst, umso größer wird das Risiko einer fehlerhaften Injektion in den in M. frontalis und damit das Auftreten einer abgesunkenen Augenbraue." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-6-3punkte-amanda.jpg",
          "alt": "Darstellung der Injektionspunkte mit 3-Punkte-Technik, dargestellt an Amanda",
          "label": "Abb. 6",
          "caption": "Darstellung der Injektionspunkte (3-Punkte-Technik), dargestellt an Amanda"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Das Botulinum wird intramuskulär appliziert, da dies die höchste Wirksamkeit gewährleistet. Die Eindringtiefe hängt von der Muskelstärke und -lage ab, beträgt jedoch in der Regel 4-8 mm, je nach Muskel und Patient:in, und geht bis auf das Periost. Eine Ausnahme bildet die Injektion in die lateralen Enden des Musculus corrugator supercilii. Eine präzise Technik entscheidet hier über mögliche Komplikationen, wie ein Absinken des Augenlids (Lidptosis) oder der Augenbraue (Browdrop). Schau hier bitte, dass Du das Botulinum nicht zu tief injiziert, um ein Platzieren in den M. frontalis zu vermeiden. Sollte dieser Muskel versehentlich getroffen werden, kann das zu einem Absinken der Augenbraue führen." }]
      },
      {
        "type": "figure",
        "attrs": {
          "src": "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/lms-images/glabella-7-7punkte-lydia.jpg",
          "alt": "Darstellung der Injektionspunkte mit 7-Punkte-Technik in Internationalen Einheiten, dargestellt an Lydia",
          "label": "Abb. 7",
          "caption": "Darstellung der Injektionspunkte (7-Punkte-Technik) in Internationale Einheiten, dargestellt an Lydia"
        }
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In der Abb. 7 siehst Du die Aufteilung des Botulinums auf 7 Injektionspunkte. Bei Lydia habe ich mich bewusst entschieden, den M. procerus und M. corrugator supercilii mit jeweils 2-4 IE (entspricht 5-10 SE) zu behandeln, während der MDS lediglich 2 IE (entspricht 5 SE) erhielt. Diese Dosierung wurde gewählt, da Lydia sich eine gewisse Restbeweglichkeit gewünscht hat. Im Video zum Anzeichnen der Punkte bei Lydia spreche ich von Speywood-Einheiten (SE), während ich in dem Video zur Behandlung von Lydia Internationale Einheiten (IE) verwende, um Dich mit beiden Dosierangaben vertraut zu machen. Die Videos zur Behandlung von Lydias besonderer anatomischen Konstellation findest Du in unserem online Grundkurs Botulinum." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Im Markierungsvideo zur Behandlung vom Lydias Glabella wird gezeigt, dass der M. procerus manchmal wie gespalten aussieht. Dieses Erscheinungsbild kann durch den Zug des M. depressor supercilii entstehen. Hier ist es wichtig, die Muskelkontraktion genau zu beobachten und die entstehenden Muskelbäuche als Orientierungspunkte zu nutzen. Manchmal gestaltet es sich schwierig, den M. corrugator supercilii vom M. depressor supercilii oder M. procerus klar zu unterscheiden. Sollte eine eindeutige Abgrenzung der Muskeln nicht möglich sein, empfiehlt es sich, das Botulinum in den Bereich der größten Kraftausübung (Muskelbauch) zu injizieren. An Lydia wird deutlich, wie wichtig eine individuelle Betrachtung Deiner Patient:innen ist. Das starre Anwenden eines festgelegten Schemas erhöht das Risiko für Komplikationen und wird den Bedürfnissen Deiner Patient:innen nicht gerecht." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Die Dosierung und Verteilung des Botulinums ist stets individuell anpassbar. Höhere Dosierungen können bei Patient:innen mit ausgeprägtem Muskeltonus oder dem Wunsch nach einer längeren Wirkungsdauer sinnvoll sein. Solche Entscheidungen bespreche ich immer ausführlich mit den Patient:innen, um sowohl deren Wünsche als auch die anatomischen Gegebenheiten bestmöglich zu berücksichtigen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Im lateral gelegenen Bereich werden zwei weitere Punkte mit jeweils 2 IE (entspricht 5 SE) behandelt. Sei bei der Behandlung der lateralen Glabella besonders vorsichtig: Je näher Du in Richtung der medialen Augenbraue arbeitest, desto höher ist das Risiko eines Liddrops. Das liegt daran, dass Du in der Nähe des Orbitalseptums injizierst und versehentlich den M. levator palpebrae superioris (innerviert durch den N. oculomotorius, ramus superior) beeinflussen könntest. Ein höheres Injektionsvolumen oder eine größere Botulinum-Dosis erhöht dieses Risiko zusätzlich. Solltest Du den lateralen Anteil des M. corrugator supercilii behandeln, achte darauf, oberflächlich subdermal zu injizieren und nicht zu tief Richtung Periost vorzudringen, um Komplikationen zu vermeiden." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Bei Patient:innen mit besonders starken Glabella-Muskeln, die eine höhere Dosis Botulinum erfordern, kann es sinnvoll sein, die Lösung konzentrierter aufzubereiten, insbesondere, wenn Du kein ready-to-use Botulinum wie Relfydess® verwendest. Nutze zum Beispiel bei Azzalure statt der üblichen Verdünnung von 1,25 ml für 125 SE eine Verdünnung von 0,63 ml für 125 SE. Damit erhältst Du 20 SE pro 0,1 ml anstelle von 10 SE." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Dieser Ansatz ermöglicht es Dir, mit weniger Volumen eine höhere Dosierung zu injizieren. Das ist besonders vorteilhaft, wenn Du viele Einheiten verwenden möchtest, da ein geringeres Volumen das Risiko für Komplikationen, wie z. B. einen Liddrop, reduziert. Ein niedrigeres Injektionsvolumen minimiert den Spread des Botulinums und senkt somit das Risiko, benachbarte Strukturen wie den M. levator palpebrae superioris versehentlich zu beeinflussen." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Legende" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "--- oberflächliche, subdermale Injektion" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "x   tiefe, auf das Periost gehende Injektion" }]
      },
      {
        "type": "summaryBand",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "Nach diesem Kapitel weiß ich, dass ..." }] },
          { "type": "paragraph", "content": [{ "type": "text", "text": "Hier findest Du eine Zusammenfassung mit den wichtigsten Punkten aus diesem Kapitel:" }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Dosierung und Punktverteilung individuell angepasst werden müssen, basierend auf der Muskelaktivität, den anatomischen Gegebenheiten und den ästhetischen Wünschen der Patient:innen." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Muskeln der Glabella bei Deinen Patient:innen unterschiedlich ausgeprägt und sichtbar sein können." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Dir die Kenntnis von Kraftvektoren und die Orientierung an Muskelbäuchen bei der Platzierung des Botulinums helfen kann." }] }] }
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
                  { "type": "text", "text": "Happak, W., Liu, J., Burggasser, G., Flowers, A., Gruber, H. and Freilinger, G. (1997), Human facial muscles: Dimensions, motor endplate distribution, and presence of muscle fibers with multiple motor endplates. Anat. Rec., 249: 276-284. " },
                  { "type": "text", "text": "https://doi.org/10.1002/(SICI)1097-0185(199710)249:2<276::AID-AR15>3.0.CO;2-L", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1002/(SICI)1097-0185(199710)249:2<276::AID-AR15>3.0.CO;2-L" } }] }
                ]
              }
            ]
          }
        ]
      }
    ]
  }$json$::jsonb,
  1,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
