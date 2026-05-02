import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz | EPHIA",
  description:
    "Datenschutzerklärung der EPHIA Medical GmbH. Informationen zur Erhebung, Verarbeitung und Nutzung personenbezogener Daten.",
  alternates: { canonical: "https://ephia.de/datenschutz" },
};

type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] };

type Section = {
  title: string;
  blocks: Block[];
};

const INTRO: Block[] = [
  {
    type: "p",
    text: "Diese Datenschutzerklärung erläutert, wie wir, die Betreiber der Webseite https://ephia.de Deine persönlichen Daten als Nutzer der Webseite gemäß der Datenschutz-Grundverordnung (DSGVO) verwalten.",
  },
  {
    type: "p",
    text: "Deine Privatsphäre und der Schutz Deiner privaten Daten liegen uns am Herzen. Wir sammeln, verarbeiten und nutzen Deine personenbezogenen Informationen in Übereinstimmung mit den Bestimmungen dieser Datenschutzerklärung sowie den relevanten Datenschutzgesetzen, insbesondere dem Datenschutzgesetz (DSG) und der DSGVO. Diese Datenschutzbestimmungen klären auf, welche Art von persönlichen Daten wir von Dir sammeln, verarbeiten und nutzen. Wir laden Dich daher ein, die nachstehenden Informationen aufmerksam zu lesen.",
  },
];

const SECTIONS: Section[] = [
  {
    title: "1. Das Sammeln von personenbezogenen Daten",
    blocks: [
      {
        type: "p",
        text: "Unter personenbezogenen Daten, wie in diesen Datenschutzbestimmungen definiert, versteht man sämtliche Informationen, die sich auf eine bestimmte oder bestimmbare natürliche Person beziehen. Dies umfasst in erster Linie Daten wie Deinen Namen, Deine E-Mail-Adresse, Wohnadresse und Telefonnummer.",
      },
      {
        type: "p",
        text: "Zudem fallen Informationen über die Nutzung unserer Webseite unter die Kategorie personenbezogener Daten. Wir sammeln und verarbeiten solche Daten ausschließlich, wenn Du uns diese aktiv zur Verfügung stellst. Indirekte persönliche Daten, außer der IP-Adresse, deren Erfassung aus technischen Gründen für die Nutzung unseres Services notwendig ist, werden nicht gespeichert oder bearbeitet. Dies erfolgt vornehmlich durch Einsatz von Logfiles und Cookies, zu denen Du weitere Details weiter unten findest.",
      },
      {
        type: "p",
        text: "Deine personenbezogenen Daten bewahren wir nur so lange auf, wie es zur Erreichung der genannten Zwecke notwendig ist. Generell speichern wir Deine Daten (i) bis zum Ende der Geschäftsbeziehung mit Dir, oder (ii) solange es gesetzliche Aufbewahrungspflichten gibt, oder (iii) bis eventuelle rechtliche Ansprüche, für deren Durchsetzung oder Verteidigung die Daten erforderlich sind, verjährt sind. Im Falle der Erfassung Deiner IP-Adresse bewahren wir diese nur für die Dauer Deiner Webseitennutzung auf und löschen oder anonymisieren sie unmittelbar danach durch Kürzung.",
      },
    ],
  },
  {
    title: "2. Zweck und Rechtsgrundlagen der Datenverwendung",
    blocks: [
      { type: "h3", text: "2.1 Zwecke der Datenverwendung" },
      {
        type: "p",
        text: "Wir nutzen Deine persönlichen Informationen für die nachstehenden Zwecke:",
      },
      {
        type: "ul",
        items: [
          "Zur Bereitstellung der Dienste, die Du von uns anforderst.",
          "Um sicherzustellen, dass unsere Webseite Dir gegenüber auf möglichst effiziente und ansprechende Weise dargestellt wird.",
          "Zur Erfüllung unserer vertraglichen Pflichten, die aus jeglichen Verträgen resultieren, die zwischen Dir und uns geschlossen wurden.",
          "Um Dir die Möglichkeit zu geben, an unseren interaktiven Angeboten teilzunehmen, sofern Du daran interessiert bist.",
          "Um Dich über Veränderungen unserer Dienstleistungen zu informieren.",
        ],
      },
      { type: "h3", text: "2.2 Rechtsgrundlagen" },
      {
        type: "p",
        text: "Die Verarbeitung Deiner personenbezogenen Daten stützt sich auf die folgenden rechtlichen Grundlagen:",
      },
      {
        type: "ul",
        items: [
          "Deine Einwilligung zur Verarbeitung Deiner persönlichen Daten für einen oder mehrere spezifische Zwecke, wie in Art. 6 Abs. 1 lit. a der Datenschutz-Grundverordnung (DSGVO) festgelegt.",
          "Die Notwendigkeit, einen Vertrag, den wir mit Dir geschlossen haben, zu erfüllen oder vorvertragliche Maßnahmen durchzuführen, die auf Deine Anfrage hin notwendig sind, gemäß Art. 6 Abs. 1 lit. b DSGVO.",
          "Ein überwiegendes berechtigtes Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO, das in der Erreichung der unter Punkt 2.1 genannten Zwecke besteht.",
          "Die Notwendigkeit, rechtlichen Verpflichtungen nachzukommen, denen wir unterliegen, wie in Art. 6 Abs. 1 lit. c DSGVO dargelegt.",
        ],
      },
      {
        type: "p",
        text: "Falls die Verarbeitung Deiner Daten auf Deine Einwilligung basiert, hast Du das Recht, diese Einwilligung jederzeit zu widerrufen. Dies berührt nicht die Rechtmäßigkeit der auf Grundlage Deiner Einwilligung bis zum Widerruf erfolgten Verarbeitungen.",
      },
    ],
  },
  {
    title: "3. Informationen über Deinen Computer, Cookies und Targeting",
    blocks: [
      {
        type: "p",
        text: "3.1 Bei jedem Besuch unserer Webseite sammeln wir bestimmte Informationen über Deinen Computer, einschließlich Deiner IP-Adresse, der Anfrage Deines Browsers sowie des Zeitpunkts dieser Anfrage. Des Weiteren erfassen wir den Status und die Datenmenge, die im Rahmen Deiner Anfrage übermittelt werden, sowie Produkt- und Versionsinformationen über den von Dir genutzten Browser und das Betriebssystem Deines Computers. Auch die Herkunftswebseite, von der aus Du auf unsere Seite gelangt bist, wird festgehalten. Deine IP-Adresse wird nur während Deiner Nutzung der Webseite gespeichert und danach sofort gelöscht oder durch Kürzung anonymisiert. Diese Informationen nutzen wir, um unsere Webseite zu betreiben, etwaige Fehler zu identifizieren und zu beheben, die Auslastung der Webseite zu überwachen sowie Anpassungen oder Verbesserungen vorzunehmen.",
      },
      {
        type: "p",
        text: "3.2 Es kann sein, dass wir Informationen über Deine Nutzung unserer Webseite auch mittels Browser-Cookies erfassen. Das sind kleine Textdateien, die auf Deinem Gerät gespeichert werden und die bestimmte Einstellungen und Daten für den Austausch mit unserem System über Deinen Browser speichern. Ein Cookie enthält meist den Namen der Domain, von der es gesendet wurde, Angaben zur Lebensdauer des Cookies und einen alphanumerischen Identifikator. Cookies helfen unseren Systemen, Dein Gerät zu erkennen und sofortige Voreinstellungen bereitzustellen.",
      },
      {
        type: "p",
        text: "3.3 Die in unseren Cookies gespeicherten Informationen beschränken sich ausschließlich auf die oben genannten Daten bezüglich Deiner Nutzung der Webseite. Eine persönliche Identifikation erfolgt nicht, sondern durch Zuweisung einer Identifikationsnummer zum Cookie („Cookie-ID“). Eine Verknüpfung der Cookie-ID mit Deinem Namen, Deiner IP-Adresse oder ähnlichen Daten, die eine Zuordnung des Cookies zu Dir ermöglichen würden, findet nicht statt.",
      },
      {
        type: "p",
        text: "3.4 Unsere Webseite verwendet Tracking-Technologien. Wir nutzen diese, um das Online-Angebot für Dich attraktiver zu gestalten. Diese Technologie ermöglicht es, Nutzer:innen, die bereits Interesse an unserer Webseite gezeigt haben, auf den Webseiten unserer Partner mit Werbung anzusprechen. Die Einblendung dieser Werbemittel erfolgt auf Basis einer Cookie-Technologie und einer Analyse Deines vorherigen Nutzungsverhaltens, jedoch nur, wenn Du hierzu eingewilligt hast, es für die Vertragsabwicklung notwendig ist oder gesetzliche Bestimmungen dies zulassen.",
      },
      {
        type: "p",
        text: "3.5 Wir arbeiten auch mit Geschäftspartnern zusammen, die uns dabei unterstützen, das Online-Angebot und die Webseite für Dich interessanter zu gestalten. Deshalb werden auch Cookies von Partnerunternehmen auf Deiner Festplatte gespeichert, die sich nach einer festgelegten Zeit automatisch löschen. Auch bei diesen Cookies erfolgt die Datenerhebung ausschließlich über eine Cookie-ID, die unseren Werbepartnern ermöglicht, Dich mit für Dich relevanter Werbung anzusprechen.",
      },
      {
        type: "p",
        text: "3.6 Wenn Du die Verwendung von Browser-Cookies nicht wünschst, kannst Du Deinen Browser so konfigurieren, dass die Speicherung von Cookies nicht akzeptiert wird. Beachte jedoch, dass unsere Webseite möglicherweise nur eingeschränkt oder gar nicht nutzbar ist, wenn Cookies blockiert werden. Wenn Du nur unsere Cookies, aber nicht die Cookies unserer Dienstleister und Partner akzeptieren möchtest, kannst Du die Einstellung „Cookies von Drittanbietern blockieren“ in Deinem Browser wählen.",
      },
    ],
  },
  {
    title: "4. Meta Pixel (Facebook-/Instagram-Tracking)",
    blocks: [
      {
        type: "p",
        text: "Damit wir unsere Werbung bei Facebook und Instagram noch gezielter und besser auf Dich abstimmen können, nutzen wir auf unserer Website das sogenannte Meta Pixel der Meta Platforms Ireland Ltd. (4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Irland).",
      },
      { type: "h3", text: "Was passiert da genau?" },
      {
        type: "p",
        text: "Wenn Du einer unserer Werbeanzeigen bei Meta (Facebook/Instagram) folgst und dann auf unserer Website landest, hilft uns das Meta Pixel dabei nachzuvollziehen, wie Du Dich dort verhältst, zum Beispiel, ob Du auf einen Button klickst oder ein Formular ausfüllst. So können wir besser verstehen, welche Anzeigen gut funktionieren (Conversion Tracking) und unsere Kommunikation laufend verbessern.",
      },
      {
        type: "p",
        text: "Außerdem können wir, wenn Du zustimmst, gezielter mit Werbung auf Instagram und Facebook auf Dich zukommen (Retargeting). Das funktioniert nur, wenn Du dort auch eingeloggt bist. Meta kann dann mithilfe des Pixels einen Bezug zu Deinem Profil herstellen.",
      },
      { type: "h3", text: "Welche Daten fließen dabei?" },
      {
        type: "p",
        text: "Wenn Du unsere Seite besuchst und dem Einsatz von Marketing-Cookies zustimmst, baut das Pixel eine Verbindung zu Meta auf. Dabei können z. B. folgende Infos übermittelt werden:",
      },
      {
        type: "ul",
        items: [
          "Welche Seiten Du bei uns besuchst",
          "Welche Aktionen Du ausführst (z. B. Klicks oder Formulare)",
          "Technische Infos zu Deinem Browser oder Gerät",
          "Gekürzte IP-Adresse und Referrer-URL",
        ],
      },
      {
        type: "p",
        text: "Meta kann zusätzlich ein Cookie auf Deinem Gerät speichern (z. B. _fbp), das Dich bei einem erneuten Besuch erkennt, natürlich nur, wenn Du vorher eingewilligt hast.",
      },
      { type: "h3", text: "Deine Entscheidung, Deine Kontrolle" },
      {
        type: "p",
        text: "Das Meta Pixel wird nur aktiviert, wenn Du dem explizit zustimmst (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TTDSG). Du kannst Deine Einwilligung jederzeit über die Cookie-Einstellungen auf unserer Website widerrufen. Wenn Du Facebook nutzt, kannst Du dort zusätzlich in Deinen Kontoeinstellungen steuern, ob Du personalisierte Werbung erhalten möchtest.",
      },
      { type: "h3", text: "Datenübermittlung in die USA" },
      {
        type: "p",
        text: "Die gesammelten Daten werden zunächst innerhalb der EU verarbeitet. Meta kann sie aber auch an Server in den USA übermitteln. Meta ist laut eigenen Angaben nach dem EU-U.S. Data Privacy Framework (DPF) zertifiziert. Zusätzlich haben wir Standardvertragsklauseln mit Meta vereinbart, um Deine Daten bestmöglich zu schützen. Trotzdem möchten wir Dich darauf hinweisen, dass US-Behörden unter Umständen Zugriff auf diese Daten erhalten können.",
      },
    ],
  },
  {
    title: "5. Datensicherheit",
    blocks: [
      {
        type: "p",
        text: "Alle Daten, die Du uns übermittelst, werden auf Servern innerhalb der Europäischen Union gespeichert. Trotz unserer Bemühungen um eine sichere Übertragung von Informationen im Internet können wir die Sicherheit der Daten, die online an unsere Webseite gesendet werden, nicht vollständig garantieren. Um Deine Daten bestmöglich zu schützen, setzen wir umfangreiche technische und organisatorische Sicherheitsmaßnahmen ein, die gegen den Verlust, die Zerstörung, den unbefugten Zugriff, die Veränderung oder die Verbreitung Deiner Daten durch unbefugte Dritte schützen sollen. Ein wichtiger Aspekt unserer Sicherheitsmaßnahmen ist die verschlüsselte Übertragung Deiner persönlichen Daten. Hierfür verwenden wir die Verschlüsselungstechnologie SSL (Secure Socket Layer).",
      },
    ],
  },
  {
    title: "6. Keine Weitergabe Deiner personenbezogenen Daten",
    blocks: [
      {
        type: "p",
        text: "Wir übermitteln Deine personenbezogenen Daten nicht an Dritte, außer Du hast uns Deine explizite Zustimmung dazu erteilt oder wir sind durch gesetzliche Vorgaben und/oder behördliche oder gerichtliche Anweisungen zur Weitergabe Deiner Daten berechtigt oder verpflichtet. Dies betrifft vor allem Situationen, in denen Informationen für Zwecke der Strafverfolgung, der Gefahrenabwehr oder zur Wahrung von Urheberrechten erforderlich sind. Bitte beachte, dass Du das Recht hast, Deine einmal erteilte Zustimmung jederzeit zu widerrufen.",
      },
    ],
  },
  {
    title: "7. Datenschutz und Websites Dritter",
    blocks: [
      {
        type: "p",
        text: "7.1 Unsere Website kann Hyperlinks zu, sowie von, Websites Dritter enthalten. Wenn Du diesen Links folgst, beachte bitte, dass wir keine Verantwortung für externe Inhalte oder Datenschutzpraktiken übernehmen können. Es ist wichtig, dass Du Dich mit den Datenschutzrichtlinien dieser Drittseiten vertraut machst, bevor Du persönliche Daten an sie weitergibst.",
      },
      {
        type: "p",
        text: "7.2 Wir kooperieren mit verschiedenen sozialen Netzwerken. Wenn Du diese Dienste nutzt, verbindet sich Dein Browser automatisch mit dem entsprechenden sozialen Netzwerk und teilt Informationen wie Deine IP-Adresse und möglicherweise auch Cookies, sofern Du die Plattform zuvor besucht hast. Wir minimieren die Übertragung dieser Daten, bis Du tatsächlich mit einer Plattform interagierst. Durch das Klicken auf das entsprechende Symbol (z. B. das Instagram-Logo) signalisierst Du Deine Bereitschaft zur Kommunikation mit der gewählten Plattform, und Informationen über Dich, wie Deine IP-Adresse, werden an dieses soziale Netzwerk übermittelt.",
      },
      {
        type: "p",
        text: "7.3 Unsere Seite ist durch Google reCAPTCHA geschützt, wobei die Datenschutzerklärung und Nutzungsbedingungen von Google gelten.",
      },
      {
        type: "p",
        text: "7.4 Diese Webseite nutzt Google Analytics, einen Dienst zur Webanalyse von Google Inc. („Google“). Google Analytics setzt Cookies ein, die auf Deinem Gerät gespeichert werden und die Analyse Deiner Nutzung der Webseite ermöglichen. Die Grundlage für die Datenverarbeitung ist unser berechtigtes Interesse, eine kosteneffiziente und benutzerfreundliche Zugriffsstatistik unserer Webseite zu erstellen. Die durch Cookies gesammelten Informationen über Deine Nutzung der Webseite werden in der Regel an einen Google-Server in den USA übertragen und dort gespeichert. Auf dieser Webseite wurde Google Analytics um den Code „gat._anonymizeIp();“ ergänzt, um eine anonymisierte Erfassung von IP-Adressen (sog. IP-Masking) zu ermöglichen.",
      },
      {
        type: "p",
        text: "7.5 Unsere Website integriert Funktionen von YouTube. Diese Funktionen werden von YouTube, LLC, 901 Cherry Ave., San Bruno, CA 94066, USA, angeboten. Das Aufrufen von Seiten mit eingebetteten YouTube-Videos kann dazu führen, dass Cookies auf Deinem Gerät gespeichert werden. Durch das Ansehen der Videos erklärst Du Dich mit der Verarbeitung der über Dich erhobenen Daten durch YouTube einverstanden.",
      },
    ],
  },
  {
    title: "8. Änderungen dieser Datenschutzerklärung",
    blocks: [
      {
        type: "p",
        text: "Wir behalten uns das Recht vor, diese Datenschutzerklärung jederzeit für die Zukunft zu ändern. Die aktuellste Version ist stets auf unserer Webseite abrufbar. Wir empfehlen Dir, unsere Webseite regelmäßig zu besuchen, um Dich über die aktuellen Datenschutzrichtlinien zu informieren.",
      },
    ],
  },
  {
    title: "9. Deine Rechte und Kontaktmöglichkeiten",
    blocks: [
      {
        type: "p",
        text: "In Bezug auf die Verarbeitung Deiner personenbezogenen Daten stehen Dir umfassende Rechte zur Verfügung. Dazu gehört das Recht auf Auskunft sowie unter Umständen das Recht auf Berichtigung, Löschung oder Sperrung Deiner Daten. Ebenfalls kannst Du eine Einschränkung der Datenverarbeitung beantragen, Dein Widerspruchsrecht ausüben sowie Dein Recht auf Datenübertragbarkeit geltend machen.",
      },
      {
        type: "p",
        text: "Um eines Deiner Rechte in Anspruch zu nehmen oder weitere Informationen zu erhalten, kontaktiere uns bitte unter customerlove@ephia.de.",
      },
      {
        type: "p",
        text: "Zudem hast Du das Recht, bei der Datenschutzbehörde Beschwerde einzulegen, erreichbar unter bfdi.bund.de. Bei Fragen, Kommentaren oder Anfragen bezüglich der Verarbeitung Deiner persönlichen Daten durch uns, kontaktiere uns bitte ebenfalls über die angegebenen Kontaktdaten.",
      },
    ],
  },
];

function renderBlock(block: Block, idx: number) {
  if (block.type === "h3") {
    return (
      <h3 key={idx} className="text-base font-bold mt-5 mb-2">
        {block.text}
      </h3>
    );
  }
  if (block.type === "ul") {
    return (
      <ul
        key={idx}
        className="list-disc pl-6 text-base leading-relaxed space-y-2 mb-4"
      >
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={idx} className="text-base leading-relaxed mb-4">
      {block.text}
    </p>
  );
}

export default function DatenschutzPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-black">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide mb-10">
        DATENSCHUTZ
      </h1>

      <div className="mb-10">{INTRO.map(renderBlock)}</div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-10">
          <h2 className="text-lg md:text-xl font-bold mb-3">{section.title}</h2>
          {section.blocks.map(renderBlock)}
        </section>
      ))}
    </article>
  );
}
