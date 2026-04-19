import type { CourseFaqContent } from "./types";

/**
 * FAQ + contact page content. The 5 questions visible on the live
 * www.ephia.de/faq-kontakt PDF are preserved verbatim; the rest are
 * SEO-motivated additions aimed at common queries that land on the
 * EPHIA domain (CME, prices, locations, Zahnärzt:innen, Proband:innen).
 */
export const faqKontakt: { faq: CourseFaqContent } = {
  faq: {
    heading: "FAQ",
    items: [
      // ── From the PDF (verbatim) ───────────────────────────────────
      {
        question:
          "Muss ich approbierte Ärztin / approbierter Arzt sein, um an den Kursen teilnehmen zu können?",
        answer:
          "Ja, unsere Kurse richten sich speziell an approbierte Ärztinnen und Ärzte. Dies stellt sicher, dass alle Teilnehmenden über die notwendige medizinische Grundlage verfügen, um die komplexen Inhalte der ästhetischen Medizin, insbesondere im Umgang mit Botox und dermalen Fillern, sicher anwenden zu können. Unsere Weiterbildungsangebote sind darauf ausgelegt, Fachkräfte in der ästhetischen Medizin mit dem neuesten Wissen und praktischen Fähigkeiten auszustatten, um eine hochwertige Patientenversorgung zu gewährleisten.",
      },
      {
        question:
          "Kann ich direkt nach Abschluss der Zertifizierung Patient:innen behandeln?",
        answer:
          "Ja, nachdem Du Deine Zertifizierung bei der EPHIA erworben hast, kannst Du direkt Patient:innen mit den Techniken behandeln, die Du in unseren Kursen erlernt hast. Es ist allerdings wichtig, dass Du auch die rechtlichen Vorgaben und berufsrechtlichen Rahmenbedingungen in Deinem Land bzw. in Deiner Region beachtest. Diese können sich auf die erforderlichen Qualifikationen und die Zulassung zur Ausübung der ästhetischen Medizin beziehen. Stelle also sicher, dass Du alle notwendigen Bedingungen erfüllst, bevor Du mit der Behandlung von Patient:innen beginnst. Unsere Dozierenden stehen Dir in unserem Community-Bereich auch nach den Kursen bei Fragen zur Seite. Wir wollen, dass Du sicher und hochwertig Deine Patient:innen behandeln kannst. Darum begleiten wir Dich auch nach Deiner Ausbildung in Deiner praktischen Tätigkeit.",
      },
      {
        question:
          "Was passiert, wenn ich an einem bereits gebucht und bezahlten Kurs nicht teilnehmen kann?",
        answer:
          "Du kannst Deine Buchung bis spätestens 14 Tage vor Kursbeginn kostenfrei stornieren. Nach diesem Zeitpunkt ist eine Rückerstattung der Kursgebühr nicht mehr möglich. Eine Umbuchung des Praxiskurses auf ein anderes Datum ist einmalig möglich bis 7 Tage vor dem Kursdatum. Für die Umbuchung fällt eine Bearbeitungsgebühr von maximal 10 % des Kurswertes an. Sende uns dazu ganz einfach eine E-Mail an customerlove@ephia.de.",
      },
      {
        question:
          "Nach dem Kurs sind bei mir Fragen aufgekommen. Wer kann mir diese beantworten?",
        answer:
          "Wenn nach oder vor dem Kurs Fragen aufkommen, kannst Du Dich jederzeit an customerlove@ephia.de wenden. Wir tun unser Bestes Dir so schnell wie möglich eine qualifizierte Antwort zu senden.",
      },
      {
        question: "Muss ich eine Proband:in zum Kurs mitbringen?",
        answer:
          "Ja. Es ist erwünscht, dass Kursteilnehmer:innen eigene Proband:innen an die Kurse mitbringen. Solltest Du keine eigene Probandin / keinen eigenen Probanden rekrutieren können, so haben wir einen Pool an Proband:innen auf die wir im Notfall zurückgreifen können. Bitte kontaktiere uns falls Du hierzu Unterstützung benötigen solltest.",
      },

      // ── SEO-motivated additions ───────────────────────────────────
      {
        question: "Welche Kurse bietet EPHIA an?",
        answer:
          "EPHIA bietet eine strukturierte Weiterbildung in der ästhetischen Medizin für approbierte Ärzt:innen. Unser Angebot umfasst Grundkurse (Botulinum, Dermalfiller, Medizinische Hautpflege) sowie Aufbaukurse (Periorale Zone, Therapeutische Indikationen, Lippen, Biostimulation & Skinbooster) und spezielle Kurse für Zahnärzt:innen. Jeder Kurs kombiniert wissenschaftlich fundierte Theorie mit intensivem Praxistraining an echten Proband:innen. Eine vollständige Übersicht findest Du unter „Unsere Kurse“.",
      },
      {
        question: "Sind Eure Kurse CME-akkreditiert?",
        answer:
          "Ja. Unsere Praxiskurse sind bei der Landesärztekammer zur CME-Anerkennung angemeldet bzw. bereits akkreditiert. Für jeden akkreditierten Kurs erhältst Du nach erfolgreicher Teilnahme die entsprechenden CME-Punkte. Den aktuellen Status (akkreditiert / beantragt) findest Du direkt auf der jeweiligen Kursseite in der Kurs-Übersicht.",
      },
      {
        question: "Wo finden die Praxiskurse statt?",
        answer:
          "Unsere Praxiskurse finden in Berlin-Mitte in einer modernen, gut ausgestatteten Praxis statt. Die genaue Adresse und Anfahrtshinweise bekommst Du mit der Buchungsbestätigung per E-Mail zugeschickt.",
      },
      {
        question: "Bietet EPHIA auch reine Online-Kurse an?",
        answer:
          "Ja. Zu den meisten unserer Kurse gibt es einen Online-Teil, den Du unabhängig vom Praxistermin absolvieren kannst. Einige Kurse (z.B. Medizinische Hautpflege oder Periorale Zone) sind komplett online verfügbar. Beim Kombikurs (Online + Praxis) verbinden wir beide Formate, sodass Du die Theorie in Deinem Tempo durchgehen kannst und anschließend am Praxistag vollen Fokus auf die Behandlung hast.",
      },
      {
        question: "Gibt es Kurse speziell für Zahnärzt:innen?",
        answer:
          "Ja. Wir bieten einen dedizierten Grundkurs Botulinum für Zahnärzt:innen, der die besonderen Indikationen im zahnmedizinischen Kontext (Bruxismus, Gummy Smile, Masseter-Hypertrophie etc.) abdeckt. Der Kurs richtet sich ausschließlich an approbierte Zahnärzt:innen und berücksichtigt die berufsrechtlichen Rahmenbedingungen für ästhetische Behandlungen durch Zahnärzt:innen in Deutschland.",
      },
      {
        question: "Welche Zertifikate erhalte ich nach Abschluss eines Kurses?",
        answer:
          "Nach erfolgreichem Abschluss erhältst Du ein EPHIA-Zertifikat, das Deine Teilnahme und die erworbenen Kompetenzen dokumentiert. Bei CME-akkreditierten Kursen werden die Punkte direkt an die Landesärztekammer gemeldet und erscheinen in Deinem CME-Konto. Das Zertifikat bekommst Du als PDF zugeschickt, sodass Du es für Deine Praxis-Dokumentation oder interne Weiterbildungsnachweise verwenden kannst.",
      },
      {
        question: "Was kostet ein Kurs bei EPHIA?",
        answer:
          "Die Preise variieren je nach Format. Reine Onlinekurse starten bei etwa 250 €, Praxiskurse ab etwa 1.040 € und der Kombikurs (Online + Praxis) ab etwa 1.290 €. Für einzelne Spezialkurse gibt es Komplettpakete mit mehreren Modulen zum vergünstigten Gesamtpreis. Den aktuellen Preis findest Du jeweils direkt auf der Kurs-Landingpage.",
      },
      {
        question: "Wie funktioniert die Zahlung?",
        answer:
          "Die Buchung erfolgt online über unseren sicheren Stripe-Checkout. Akzeptiert werden gängige Kredit- und Debitkarten sowie SEPA-Lastschrift. Du erhältst automatisch eine Buchungsbestätigung und kurz danach Deine Rechnung per E-Mail. Bei SEPA-Lastschrift kann die Rechnung einige Werktage verzögert eintreffen, da wir auf die Zahlungsbestätigung warten.",
      },
      {
        question: "Kann ich als Proband:in an einer Behandlung teilnehmen?",
        answer:
          "Ja! Unter proband-innen.ephia.de kannst Du Dich als Proband:in anmelden und bekommst so die Möglichkeit, kostenfrei oder gegen geringe Gebühr eine ästhetische Behandlung durch unsere Kursteilnehmer:innen zu erhalten. Alle Behandlungen finden unter direkter Anleitung und Supervision unserer erfahrenen Dozierenden statt. Du trägst so aktiv zur Ausbildung der nächsten Ärzt:innen-Generation bei.",
      },
      {
        question: "Bietet Ihr auch Gruppen- oder Inhouse-Kurse an?",
        answer:
          "Ja. Ab 4 Teilnehmer:innen erstellen wir Dir gerne ein maßgeschneidertes Angebot für Dein Team, zum Beispiel für eine Praxisgemeinschaft oder eine Fachgesellschaft. Gruppenbuchungen können in unseren Räumen in Berlin stattfinden oder auf Wunsch auch als Inhouse-Schulung bei Dir vor Ort. Schreib uns dazu einfach eine Mail mit Anzahl Teilnehmer:innen, gewünschtem Kursinhalt und Zeitraum an customerlove@ephia.de.",
      },
    ],
  },
};
