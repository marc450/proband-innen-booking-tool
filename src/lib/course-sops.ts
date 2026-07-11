/**
 * Course SOPs (Standardarbeitsanweisungen), keyed by
 * course_templates.course_key.
 *
 * These are the internal process documents for Kursbetreuung and
 * Dozent:innen. The content is static, plaintext, and non-sensitive, so
 * the whole registry is client-safe and rendered directly in a modal by
 * <CourseSopButton>. To add an SOP for another course, register it under
 * its course_key here; the button appears automatically wherever the
 * component is mounted.
 *
 * Same registry-by-course_key shape as course-program-pdf-meta.ts.
 */

export type SopBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] };

export interface SopSection {
  heading: string;
  blocks: SopBlock[];
}

export interface CourseSop {
  /** Document title, e.g. "EPHIA Praxiskurs Botulinum". */
  title: string;
  version: string;
  /** "Gültig ab". */
  validFrom: string;
  /** "Datum Inkrafttreten". */
  effectiveDate: string;
  author: string;
  reviewer: string;
  /** "Erstellungsdatum". */
  createdOn: string;
  sections: SopSection[];
  footerNote: string;
}

const BOTULINUM_PRAXISKURS_SOP: CourseSop = {
  title: "EPHIA Praxiskurs Botulinum",
  version: "01",
  validFrom: "15.12.2025",
  effectiveDate: "14.12.2025",
  author: "Dr. Sophia Wilk-Vollmann, DESAIC",
  reviewer: "Marc Wyss",
  createdOn: "08. April 2026",
  footerNote: "Nur für den internen Gebrauch der EPHIA Medical GmbH.",
  sections: [
    {
      heading: "1. Zweck und Leitbild",
      blocks: [
        {
          type: "p",
          text: "Diese Standardarbeitsanweisung (SOP) definiert verbindliche Standards für die Durchführung des EPHIA Präsenz-Grundkurses Botulinum. Ziel ist eine qualitativ hochwertige, sichere, diskriminierungssensible und wertungsfreie Ausbildung, die Patient:innen- und Teilnehmendenzentrierung in den Mittelpunkt stellt.",
        },
        {
          type: "p",
          text: "Diese SOP regelt ausschließlich organisatorische, didaktische und qualitative Standards der ärztlichen Fortbildung im Rahmen der EPHIA Medical GmbH. Sie stellt keine Behandlungsanweisung dar und greift nicht in die ärztliche Therapiefreiheit ein. Die medizinische Behandlung der Proband:innen erfolgt eigenverantwortlich durch die behandelnde Ärzt:in auf Grundlage eines separaten Behandlungsvertrages. Es besteht keine Weisungsbefugnis der EPHIA Medical GmbH hinsichtlich medizinischer Einzelentscheidungen.",
        },
        {
          type: "p",
          text: "Oberstes Ziel ist die Kurs- und Teilnehmendenzufriedenheit bei maximaler medizinischer Sicherheit, transparenter Organisation und klaren Verantwortlichkeiten.",
        },
        { type: "p", text: "Die SOP basiert auf den Werten von EPHIA:" },
        {
          type: "list",
          items: [
            "diskriminierungssensible Medizin",
            "wertungsfreie, respektvolle Kommunikation",
            "Patient:innen- und Teilnehmendenzentrierung",
            "evidenzbasierte, verantwortungsvolle ästhetische Medizin",
          ],
        },
      ],
    },
    {
      heading: "2. Geltungsbereich",
      blocks: [
        {
          type: "p",
          text: "Diese SOP gilt für alle Präsenz-Grundkurse Botulinum der EPHIA Medical GmbH sowie für alle beteiligten Dozent:innen und Mitarbeitenden der Kursbetreuung. Alle EPHIA Mitarbeitenden sind verpflichtet, sich an diese SOP zu halten und Verbesserungsvorschläge einzubringen.",
        },
      ],
    },
    {
      heading: "3. Rollen und Verantwortlichkeiten",
      blocks: [
        { type: "h3", text: "3.1 Dozent:innen" },
        {
          type: "p",
          text: "Die Dozent:innen tragen die medizinisch-fachliche, didaktische und ethische Verantwortung für die Ausbildung und Wissensvermittlung im Rahmen des Kurses. Sie vermitteln die Lehrmeinung der EPHIA Medical GmbH. Die ärztliche Behandlung von Proband:innen erfolgt eigenverantwortlich durch die behandelnde Ärzt:in auf Grundlage eines separaten Behandlungsvertrages.",
        },
        { type: "h3", text: "3.2 Kursbetreuung" },
        {
          type: "p",
          text: "Die Kursbetreuung ist mit der Dozentin verantwortlich für Organisation, Ablauf, Dokumentation, Betreuung der Teilnehmenden und Proband:innen sowie für die Sicherstellung der SOP-konformen Durchführung.",
        },
      ],
    },
    {
      heading: "4. Anforderungen an Dozent:innen",
      blocks: [
        { type: "h3", text: "4.1 Fachliche Qualifikation" },
        {
          type: "p",
          text: "Dozent:innen verfügen über eine ärztliche Approbation sowie über eine nachweislich langjährige Erfahrung in der ästhetischen Behandlung mit Botulinum. Sie kennen die aktuellen Fachinformationen, Sicherheits- und Hygienestandards und arbeiten auf Grundlage der EPHIA-Lehrmeinung sowie der verbindlichen Kursstandards.",
        },
        { type: "h3", text: "4.2 Didaktische Qualifikation" },
        {
          type: "p",
          text: "Dozent:innen besitzen eine didaktische Ausbildung oder eine vergleichbare pädagogische Qualifikation und nehmen regelmäßig an didaktischen Weiterbildungen teil. Sie vermitteln Inhalte strukturiert, verständlich und wertungsfrei und berücksichtigen unterschiedliche Erfahrungs- und Lernstände der Teilnehmenden.",
        },
        { type: "h3", text: "4.3 Zusammenarbeit und Supervision" },
        {
          type: "p",
          text: "Dozent:innen nehmen verpflichtend an den monatlichen Calls mit dem EPHIA-Team teil. Gegenseitige Supervision innerhalb der Kurse sowie Supervision und Hospitation in anderen EPHIA-Kursformaten sind fester Bestandteil der Qualitätssicherung.",
        },
        { type: "h3", text: "4.4 Haltung und Verantwortung" },
        {
          type: "p",
          text: "Dozent:innen handeln diskriminierungssensibel, patient:innen- und teilnehmendenzentriert und übernehmen Verantwortung für medizinische Sicherheit, Lernatmosphäre und professionelle Entwicklung der Teilnehmenden. Im Vordergrund stehen eine hochwertige Lehre, ein professioneller Umgang mit den Proband:innen sowie ein wertschätzendes Miteinander im Team. Das beinhaltet, dass die Kursvor- und -nachbereitung gleichwertig getragen wird. Die Dozent:in ist der Kursbetreuer:in, außer in fachlichen Angelegenheiten, nicht weisungsbefugt.",
        },
        { type: "h3", text: "4.5 Kursvorbereitung und Zusammenarbeit" },
        {
          type: "p",
          text: "Zur Vorbereitung des Präsenz-Grundkurses nimmt die Dozent:in frühzeitig Kontakt mit der Kursbetreuung auf, um organisatorische Absprachen zu treffen, insbesondere hinsichtlich der Besorgung und Organisation der Kursverpflegung sowie weiterer vorbereitender Maßnahmen. Es wird erwartet, dass Dozent:in und Kursbetreuung den Kurs gemeinsam vorbereiten und spätestens eine Stunde vor Kursbeginn vor Ort sind, um die notwendigen Vorbereitungen strukturiert und koordiniert durchzuführen.",
        },
        {
          type: "p",
          text: "Die Kursvorbereitung erfolgt in gemeinsamer Verantwortung und im Sinne eines kooperativen Teamgedankens. Zwischen Dozent:in und Kursbetreuung besteht kein hierarchisches Verhältnis. Die Dozent:in hat gegenüber der Kursbetreuung keine Weisungs- oder Vorgesetztenfunktion. Verantwortlichkeiten werden partnerschaftlich abgestimmt und situativ geteilt, um einen reibungslosen Kursablauf sowie eine positive Lern- und Arbeitsatmosphäre zu gewährleisten.",
        },
        {
          type: "p",
          text: "Die Zusammenarbeit ist von gegenseitigem Respekt, klarer Kommunikation und einer wertschätzenden Haltung geprägt und dient dem gemeinsamen Ziel einer qualitativ hochwertigen, teilnehmenden- und patient:innenzentrierten Kursdurchführung.",
        },
        { type: "h3", text: "4.6 Verbindliche Lehrmeinung des Grundkurses" },
        {
          type: "p",
          text: "Der Präsenz-Grundkurs vermittelt eine einheitliche, standardisierte Lehrmeinung der EPHIA Medical GmbH als Ausbildungsgrundlage. Diese dient der strukturierten Wissensvermittlung im Rahmen des Kurses und stellt Orientierungswerte dar. Sie ersetzt ausdrücklich nicht die individuelle ärztliche Entscheidung im Rahmen der Behandlung von Proband:innen.",
        },
        { type: "h3", text: "4.7 Definierte Behandlungszonen" },
        {
          type: "p",
          text: "Die nachfolgenden Dosierungsempfehlungen stellen Ausbildungs- und Lehrinhalte des Präsenz-Grundkurses dar. Sie dienen der Vermittlung eines strukturierten Vorgehens im Rahmen der ärztlichen Fortbildung und sind nicht als verbindliche Behandlungsanweisung zu verstehen, sofern eigene Behandlungsverträge durch die Dozierenden mit Proband:innen abgeschlossen werden. Die letztendliche Dosierung, Punktzahl und Indikationsstellung obliegen daher ausschließlich der behandelnden Ärzt:in im Rahmen ihrer ärztlichen Therapiefreiheit und Verantwortung gegenüber der Proband:in.",
        },
        {
          type: "p",
          text: "Für die Behandlung der Stirn werden in der Regel 2,5 bis 5 Speywood-Einheiten pro Punkt empfohlen, abhängig von Muskelkraft, Mimik und individueller Anatomie. In der Glabellaregion liegt die Standarddosierung bei 10 Speywood-Einheiten pro Punkt unter Anwendung einer klassischen Drei-Punkte-Technik; bei entsprechender Anatomie und ausgeprägter Muskelaktivität kann diese auf eine Fünf-Punkte-Technik erweitert werden. Für die laterale Orbita (Lachfalten) werden bewusst niedrigere Dosierungen von 2,5 bis maximal 5 Speywood-Einheiten pro Punkt vermittelt. Damit weicht EPHIA gezielt von den im Fach- und Produktbeipacktext beschriebenen höheren Dosierungsempfehlungen ab, um das Risiko von Überdosierungen, diffuser Muskelschwächung und periorbitaler Schwellung (Puffyness) zu reduzieren. Beim Browlifting werden 2,5 Speywood-Einheiten pro Punkt empfohlen, wobei die individuelle Brauenposition und Asymmetrien stets zu berücksichtigen sind. Die Behandlung des Platysmas erfolgt ebenfalls mit 2,5 Speywood-Einheiten pro Punkt. Alle Dosierungen stellen Orientierungswerte dar und ersetzen nicht die individuelle ärztliche Entscheidung unter Berücksichtigung von Anatomie, Indikation und Behandlungsziel.",
        },
        { type: "h3", text: "4.8 Präparat und Konzentrationsgrundlage" },
        {
          type: "p",
          text: "Im Rahmen des Präsenz-Grundkurses wird ausschließlich das Botulinum Relfydess® der Firma Galderma verwendet. Die Verwendung dieses Präparats dient der Standardisierung der Ausbildung. Die Auswahl des Präparats im Rahmen der Behandlung erfolgt eigenverantwortlich durch die behandelnde Ärzt:in. Das Präparat liegt in einer Lieferform von 150 Einheiten in 1,5 ml vor und weist damit eine standardisierte Konzentration von 10 Einheiten pro 0,1 ml auf. Diese Konzentration bildet die verbindliche Grundlage der Ausbildung und dient als Referenz für alle im Kurs vermittelten Dosierungs- und Injektionstechniken.",
        },
        {
          type: "p",
          text: "Dosierungsentscheidungen sind im Kurs fachlich nachvollziehbar zu erklären und zu begründen. Dabei sind stets die individuelle Anatomie, Mimik, Muskelkraft sowie das Geschlechtsspektrum der Patient:innen zu berücksichtigen. Mögliche Über- oder Unterkorrekturen sowie die Grenzen und Limitationen der Behandlung sind offen zu thematisieren, um ein realistisches Erwartungsmanagement zu gewährleisten und die Teilnehmenden zu einer verantwortungsvollen, reflektierten Anwendung zu befähigen.",
        },
        { type: "h3", text: "4.9 Checklistenpflicht" },
        {
          type: "p",
          text: "Alle kursrelevanten Checklisten sind digital hinterlegt und ihre Bearbeitung ist verpflichtend. Die Dozent:in trägt die Verantwortung dafür, dass sämtliche Checklisten vor Kursbeginn vollständig ausgefüllt sind und die abschließende Bearbeitung nach Kursende erfolgt. Eine vollständige und fristgerechte Checklistenbearbeitung ist Voraussetzung für eine SOP-konforme Kursdurchführung.",
        },
      ],
    },
    {
      heading: "5. Material und Ausstattung",
      blocks: [
        { type: "h3", text: "5.1 Medizinische Materialien" },
        {
          type: "p",
          text: "Im Rahmen des Präsenz-Grundkurses Botulinum wird als Ausbildungspräparat ausschließlich das Botulinum Relfydess® der Firma Galderma verwendet. Die Auswahl dieses Präparats dient der Standardisierung der Lehre und orientiert sich an der Lehrmeinung des EPHIA Online-Grundkurses Botulinum. Sie stellt keine Vorgabe für die individuelle ärztliche Behandlung dar.",
        },
        {
          type: "p",
          text: "Die im Kurs vermittelte Verdünnung, sollte sie erforderlich sein, erfolgt gemäß Kursstandard zu didaktischen Zwecken. Bei Verwendung einer 0,3-ml-Spritze werden 0,15 ml Relfydess® entsprechend 15 Speywood-Einheiten aufgezogen und mit 0,15 ml Natriumchlorid verdünnt. Daraus ergibt sich eine Konzentration von 5 Speywood-Einheiten pro 0,1 ml beziehungsweise 2,5 Speywood-Einheiten pro 0,05 ml. Diese Verdünnung wird im Kurs für alle Behandlungszonen angewandt, bei denen 2,5 Speywood-Einheiten pro Punkt vermittelt werden, insbesondere für die laterale Orbita (Lachfalten), Stirn, das Browlifting sowie das Platysma.",
        },
        {
          type: "p",
          text: "Die dargestellte Verdünnung und Anwendung dienen ausschließlich der strukturierten Wissensvermittlung im Rahmen der ärztlichen Fortbildung und basieren auf der Lehrmeinung des EPHIA Online-Grundkurses Botulinum. Sie stellen Orientierungswerte dar und ersetzen nicht die individuelle ärztliche Entscheidung. Die Auswahl der Verdünnung, Dosierung und Injektionstechnik im Rahmen der Behandlung obliegt ausschließlich der behandelnden Ärzt:in in eigener medizinischer Verantwortung.",
        },
        {
          type: "p",
          text: "Zur Durchführung des Kurses werden 0,3-ml-Spritzen mit geeigneter Kanüle, Desinfektionsmittel, Tupfer sowie Einmalhandschuhe verwendet. Die Bereitstellung und der sachgerechte Einsatz der Materialien erfolgen unter Einhaltung geltender Hygiene- und Sicherheitsstandards.",
        },
        { type: "h3", text: "5.2 Dokumentation" },
        {
          type: "p",
          text: "Im Rahmen des Präsenz-Grundkurses werden Chargendokumentationsbögen, Behandlungsverträge sowie Aufklärungs- und Einwilligungserklärungen verwendet. Der Behandlungsvertrag wird ausschließlich zwischen der behandelnden Dozent:in und der Proband:in geschlossen. Die EPHIA Medical GmbH ist nicht Vertragspartei dieses Behandlungsverhältnisses.",
        },
        {
          type: "p",
          text: "Jede Anwendung von Botulinum ist im Rahmen der Behandlung vollständig und chargenbezogen zu dokumentieren. Die Dokumentation umfasst das verwendete Präparat, die Charge, die Verdünnung, das Behandlungsdatum sowie die behandelte Zone. Die Chargendokumentation wird zusammen mit der Kursbetreuung durchgeführt und im Anschluss an Galderma übermittelt.",
        },
        {
          type: "p",
          text: "Die vollständige ärztliche Aufklärung sowie die Einholung der schriftlichen Einwilligung erfolgen durch die behandelnde Dozent:in. Die Aufklärungs- und Einwilligungsunterlagen verbleiben bei der Ärzt:in, die den Behandlungsvertrag abgeschlossen hat, und sind von dieser, gemäß den gesetzlich geltenden Aufbewahrungsfristen, ordnungsgemäß zu archivieren. Eine Weitergabe der Behandlungsunterlagen an die EPHIA Medical GmbH erfolgt nicht.",
        },
        {
          type: "p",
          text: "Die ärztliche Verantwortung für die durchgeführte Behandlung liegt vollständig bei der behandelnden Dozent:in. Sie übernimmt die weitere Kommunikation mit der Proband:in sowohl im Rahmen von Nachbehandlungen als auch bei Rückfragen, Korrekturen oder im Komplikationsmanagement. Entsprechend ist die behandelnde Dozent:in verpflichtet, ihre Erreichbarkeit sicherzustellen und diese der Proband:in im Rahmen der Behandlung mitzuteilen.",
        },
        {
          type: "p",
          text: "Die behandelnde Dozent:in handelt eigenverantwortlich nach den geltenden Regeln der ärztlichen Kunst und ist verpflichtet, eine ausreichende und gültige ärztliche Haftpflichtversicherung vorzuhalten, die auch ästhetische Behandlungen mit Botulinumtoxin einschließt. Diagnostik, Therapie, Nachsorge und gegebenenfalls notwendige Maßnahmen bei Komplikationen erfolgen ausschließlich in ihrer Verantwortung und unabhängig von der EPHIA Medical GmbH.",
        },
      ],
    },
    {
      heading: "7. Kursbetreuung: Aufgaben und Erwartungen",
      blocks: [
        { type: "h3", text: "7.1 Organisation und Vorbereitung" },
        {
          type: "p",
          text: "Die Kursbetreuung ist für die organisatorische Vorbereitung des Kurses verantwortlich. Dazu gehört die Sicherstellung des Zugangs zur Praxis, zu den Proband:innenlisten, zu allen Kurs- und Teilnehmendenunterlagen sowie zu den digitalen Online-Checklisten. Dazu gehört ebenfalls die suffiziente Absprache mit der Dozent:in vorab. Die Kursbetreuung bereitet gemeinsam mit der Dozent:in die Räumlichkeiten vor, stellt alle benötigten Materialien bereit und überprüft deren Vollständigkeit und Einsatzfähigkeit. Darüber hinaus kontrolliert sie, dass sämtliche kursrelevante Dokumente vollständig vorliegen, um einen reibungslosen und SOP-konformen Ablauf zu gewährleisten.",
        },
        { type: "h3", text: "7.2 Betreuung während des Kurses" },
        {
          type: "p",
          text: "Während des Kurses fungiert die Kursbetreuung als zentrale Ansprechperson für Teilnehmende und Proband:innen. Sie koordiniert die organisatorischen Abläufe, unterstützt die Dozent:innen bei der Kursdurchführung und trägt zu einer strukturierten und ruhigen Lernatmosphäre bei. Die Kursbetreuung achtet darauf, dass der Umgang miteinander respektvoll, wertschätzend und diskriminierungssensibel erfolgt und unterstützt damit aktiv die patient:innen- und teilnehmendenzentrierte Ausrichtung des Kurses.",
        },
        { type: "h3", text: "7.3 Kursabschluss" },
        {
          type: "p",
          text: "Zum Abschluss des Kurses stellt die Kursbetreuung gemeinsam mit der Dozent:in sicher, dass alle verpflichtenden kursrelevanten Checklisten vollständig bearbeitet sind und der Zugang zu den digitalen Checklisten für alle Beteiligten gewährleistet war, sofern dies nicht bereits an anderer Stelle dokumentiert wurde. Die ordnungsgemäße Abarbeitung der Checklisten ist Bestandteil des Kursabschlusses.",
        },
        {
          type: "p",
          text: "Darüber hinaus erstellt die Kursbetreuung eine vollständige Teilnehmendenliste gemäß den jeweils gültigen Teilnehmendenlistenstandards von GALDERMA. Ebenso wird die Chargendokumentation des im Kurs verwendeten Materials vollständig zusammengeführt. Dabei ist sicherzustellen, dass alle von GALDERMA gelieferten Materialien vollständig als verbraucht dokumentiert sind. Dies umfasst insbesondere die korrekte Erfassung der gelieferten Anzahl an Botulinum-Fiolen, da ein Rückversand nicht verwendeter Materialien nicht möglich ist.",
        },
        {
          type: "p",
          text: "Die Teilnehmendenliste sowie die vollständige Chargendokumentation werden von der Kursbetreuung eingescannt und tagesgleich oder spätestens am Folgetag an die zuständige GALDERMA-Vertreterin übermittelt. Die Verantwortung für die fristgerechte und vollständige Weiterleitung der Unterlagen im Rahmen der Kursorganisation liegt bei der Kursbetreuung.",
        },
        { type: "h3", text: "7.4 Flexibilität und Haltung" },
        {
          type: "p",
          text: "Von der Kursbetreuung wird eine lösungsorientierte und flexible Haltung erwartet. Unvorhergesehene Situationen werden im Sinne der Patient:innen- und Kurssicherheit sowie unter Berücksichtigung der Kursziele professionell aufgefangen. Oberste Priorität haben dabei stets die Kurszufriedenheit und die Zufriedenheit der Teilnehmenden.",
        },
      ],
    },
    {
      heading: "8. Qualitätssicherung",
      blocks: [
        {
          type: "p",
          text: "Die Einhaltung dieser SOP ist für alle Beteiligten verpflichtend. Abweichungen von den definierten Standards sind zu dokumentieren. Das Feedback der Teilnehmenden wird systematisch erhoben und fließt in die kontinuierliche Weiterentwicklung der Kurse ein. Die SOP wird regelmäßig überprüft und bei Bedarf aktualisiert, um eine gleichbleibend hohe Qualität der Ausbildung sicherzustellen.",
        },
      ],
    },
    {
      heading: "9. Ergänzende verpflichtend mitzudenkende Themen",
      blocks: [
        {
          type: "p",
          text: "Im Rahmen der Kursdurchführung sind ergänzend relevante Themen zu berücksichtigen. Dazu zählen insbesondere Aspekte des Notfall- und Komplikationsmanagements, wie zum Beispiel der Umgang mit Ptosis, Asymmetrien oder anderen unerwünschten Wirkungen. Ebenso sind die geltenden Hygiene- und Infektionsschutzstandards einzuhalten sowie der Datenschutz und der DSGVO-konforme Umgang mit Teilnehmenden- und Proband:innendaten sicherzustellen. Transparenz hinsichtlich möglicher Interessenkonflikte ist verpflichtend. Darüber hinaus ist auf eine klare Abgrenzung zwischen Ausbildungs- und Behandlungssetting zu achten und es müssen definierte Eskalationswege für Konflikte, Unsicherheiten oder Grenzüberschreitungen bekannt und anwendbar sein.",
        },
      ],
    },
    {
      heading: "10. Inkrafttreten",
      blocks: [
        {
          type: "p",
          text: "Diese SOP tritt mit Veröffentlichung in Kraft und ist für alle Präsenz-Grundkurse Botulinum der EPHIA Medical GmbH verbindlich.",
        },
      ],
    },
  ],
};

export const COURSE_SOPS: Record<string, CourseSop> = {
  grundkurs_botulinum: BOTULINUM_PRAXISKURS_SOP,
};

export function getCourseSop(
  courseKey: string | null | undefined,
): CourseSop | null {
  if (!courseKey) return null;
  return COURSE_SOPS[courseKey] ?? null;
}

export function hasCourseSop(courseKey: string | null | undefined): boolean {
  return !!courseKey && courseKey in COURSE_SOPS;
}
