# EPHIA Brand Manual

Canonical brand reference for `proband-innen-booking-tool` and every
EPHIA surface (landing pages, booking funnel, LearnWorlds embed,
admin dashboard, transactional emails, campaigns).

This document is the single source of truth for colors. If a tone is
not on this palette, it is **not** an EPHIA color — either pick one
from this list or raise it for addition.

---

## Palette

| Token         | Hex        | Role                                | Tailwind arbitrary |
|---------------|------------|-------------------------------------|--------------------|
| Signal        | `#0066FF`  | Primary CTA, links, signal blocks   | `bg-[#0066FF]`     |
| Rose          | `#FAEBE1`  | Main brand color, page background   | `bg-[#FAEBE1]`     |
| Brown 1       | `#733D29`  | Dark accent, text on light rose     | `text-[#733D29]`   |
| Brown 2       | `#D9AA8F`  | Mid warm tone, soft highlight       | `bg-[#D9AA8F]`     |
| Brown 3       | `#BF785E`  | Coral-rose accent, warm surfaces    | `bg-[#BF785E]`     |
| Grey/Blue     | `#E0E5E9`  | Neutral surface, dividers           | `bg-[#E0E5E9]`     |

Semantic status colors (amber, emerald, red, etc.) are **not** part of
the brand palette. Use Tailwind defaults for states — they never
replace a brand color.

---

## Color roles

### Signal `#0066FF`
The direction-of-travel color. Used for:
- Primary CTAs (`Senden`, `Buchen`, `Speichern`, `Weiter`)
- Links and link-like text actions
- Progress / path elements (course Lernpfad, medallions, focus rings)
- Full-bleed signal sections that must interrupt scroll

Never tint large text with it unless the text IS the CTA. Never pair
signal blue against Brown 3 — the contrast is noisy.

### Rose `#FAEBE1`
The brand voice color. This is the *default* surface of every public
page and of the booking-funnel header. It's a warm cream that reads as
rose by comparison with the white LearnWorlds content blocks inside
iframes.

- Use as full-page background (`body`, funnel header, landing sections)
- Use as an inverse pill on a blue signal block ("return home" color)
- Use as a soft card tint when paired with Brown 1 text
- Never use for CTAs — it has no contrast against itself

### Brown 1 `#733D29`
The darkest brand tone. Used when something must be readable on Rose
without resorting to black. Also works as a premium/serious accent.

- Body text on Rose cards when plain black feels too harsh
- Icons on Rose surfaces (Trophy, Award, numbers)
- Emphasized headings in testimonials / team sections

### Brown 2 `#D9AA8F`
The softest warm tone. Almost decorative. Use sparingly.

- Very soft highlights, hover tints, decorative underlines
- Never for text (contrast is too low on Rose)

### Brown 3 `#BF785E`
The coral-rose accent. The warmest "pop" in the palette. Currently
used on:
- `Gruppenbuchungen` signal band (full-bleed coral section)
- Home hero glow / blur
- Team cards

Good on white or Rose backgrounds, not on Signal blue (vibration).
Pairs beautifully with white text on a Brown-3 bleed.

### Grey/Blue `#E0E5E9`
The system neutral. Use only for:
- Form input backgrounds on white cards
- Dividers and subtle separators
- Disabled states

Never use as a content tint — it reads as "disabled" to users.

---

## Pairings

Tested combinations that always work:

| Background     | Foreground text      | Accent                 |
|----------------|----------------------|------------------------|
| `#FAEBE1`      | `black` / `#733D29`  | `#0066FF` CTAs         |
| `#0066FF`      | `white`              | `#FAEBE1` pills/circles|
| `white`        | `black`              | `#0066FF` for CTAs     |
| `#BF785E`      | `white`              | `white/90` sub-text    |
| `#733D29`      | `#FAEBE1`            | `white` optional       |

Avoid:
- `#0066FF` on `#BF785E` (vibrates, low contrast)
- `#BF785E` on `#FAEBE1` (muddy — use `#733D29` instead)
- Brown 2 as anything text-shaped

---

## Accent hierarchy

When composing a new section, layer colors in this order:

1. **Base:** Rose `#FAEBE1` or white
2. **Content:** black / Brown 1 text
3. **Primary action:** Signal blue `#0066FF`
4. **Secondary warmth:** Brown 3 `#BF785E` for a single block or pill
5. **Neutral:** Grey/Blue `#E0E5E9` for inputs and separators

A section should rarely use more than three brand colors at once.

---

## Application notes

### CTAs
```css
background: #0066FF;
color: white;
font-weight: bold;
font-size: 1.6rem;
letter-spacing: 0;
text-transform: none;
padding: 15px 25px;
border-radius: 10px;
```
Hover: darken to `#0055DD`.

### Cards
```css
background: white;          /* or #FAEBE1 on a blue section */
border-radius: 10px;
border: none;                /* EPHIA is borderless */
box-shadow: soft (e.g. shadow-md);
```

### Pills / Badges
- Achievement pills (CME, Zertifikat): Rose `#FAEBE1` bg, Brown 1 text
- Status badges (booked/attended/no-show): Tailwind semantic colors
- Course-type pills: Signal-blue tint `#0066FF/10` with blue text

### Signal sections
A section that needs to **interrupt** (e.g. curriculum Lernpfad):
- Bg: Signal blue `#0066FF`
- Heading + body text: white
- Achievement accents: Rose `#FAEBE1` circles/pills with Brown 1 icons

### Borders
No borders. Use shadows, backgrounds, or spacing to separate elements.
The only accepted exception is a 1px `border-black/10` divider on the
funnel header, where elevation from shadow is impossible.

---

## Typography

Defined in `~/.claude/EPHIA_DESIGN_SYSTEM.md` — short version:

- **Font family:** Roboto (loaded via `next/font/google`)
- **H1:** bold, 3rem, line-height 1.25
- **Body:** regular, 1.1rem, line-height 1.65
- **CTA:** bold, 1.6rem, no uppercase, no tracking

---

## Voice & Copy

This section governs every user-facing string: landing pages, course
cards, booking funnel, transactional emails, campaigns, dashboard
labels, Slack templates, push notifications.

EPHIA does not sell courses. EPHIA sells **medical decision-making**.
Every line of copy must read as if written by a physician for a
physician — never as marketing for a beauty service.

### Nordstern (internal compass)

> Wer ästhetische Medizin macht, muss Medizin liefern.

Not a claim, not a headline. The internal test. Every meaningful copy
decision must pass it. If a line could appear on a Beauty-Salon page,
it fails.

### Claim

Primary:
> EPHIA. Deine Akademie für verantwortungsvolle ästhetische Medizin.

Allowed variants (use only when length forces it):
> EPHIA. Ästhetische Medizin mit Haltung.
> EPHIA. Die Akademie für verantwortungsvolle ästhetische Medizin.

Use the claim in: site footer, bios, sales material, sign-offs, any
context where EPHIA must be placed in a category.

### Lead headline (Auszubildende funnel)

> Vom ersten Kurs zur eigenen Praxis.

The path-promise headline. Use on the Auszubildende landing hero
(`src/app/courses/[courseKey]/`), in curriculum sections, and in paid
territories that need the career arc in one line.

### Three language principles

**1. Medizinische Klarheit.** Talk about indication, risk assessment,
anatomy, aftercare, complication management — not about looks.

| Use                                              | Avoid                                  |
|--------------------------------------------------|----------------------------------------|
| Indikation, Kontraindikation, Evidenz            | Glow, Boost, perfect, natural look     |
| Anatomie, Risikomanagement, Aufklärung           | Beauty, Anti-Aging, Lift, fresh look   |
| Nachsorge, Entscheidungslogik, Dosierung         | Wow result, flawless, transformation   |

**2. Struktur statt Hype.** Explain, order, justify. Never inflate.

| Use                                              | Avoid                                  |
|--------------------------------------------------|----------------------------------------|
| strukturiert, fundiert, nachvollziehbar          | Game-Changer, Next Level, revolutionär |
| systematisch, praxisnah, aufbauend               | Hack, ultimativ, Geheimnis             |
| begründet, seriös                                | Life-changing, must-have               |

**3. Respekt vor der Praxisrealität.** Name the physician's actual
working life. Don't exploit it.

| Use                                              | Avoid                                  |
|--------------------------------------------------|----------------------------------------|
| Klinikalltag, Zeitdruck, Verantwortung           | Hustle, Boss-Life, Mindset             |
| Approbation, zweites Standbein                   | Business-Coaching-Sprech               |
| fachliche Glaubwürdigkeit, Patient:innen         | leeres Empowerment, Selbstoptimierung  |

Emotion, humor, sharp turns are allowed and welcome — as long as they
come from clinical reality, not from ad-speak.

### Core messages (cross-channel)

Reusable as headlines, openers, captions, slide text. These pass the
Nordstern by construction.

**Medizin & Entscheidung**
- Wer ästhetische Medizin macht, muss Medizin liefern.
- Indikation vor Intervention.
- Wir lehren Entscheidungslogik. Nicht Standardästhetik.
- Struktur ersetzt Bauchgefühl.
- Aufklärung ist Teil der Behandlung.

**Haltung & Qualität**
- Nicht alles, was möglich ist, ist sinnvoll.
- Qualität beginnt vor der Behandlung.
- Gute Ergebnisse brauchen gute Entscheidungen.
- Inklusiv behandeln heißt Vielfalt mitdenken.

**Praxis & Perspektive**
- Vom ersten Kurs zur eigenen Praxis.
- Ein Curriculum ist mehr als die Summe seiner Kurse.
- Ein zweites Standbein braucht medizinische Substanz.
- Privatpraxis beginnt nicht mit Marketing, sondern mit Kompetenz.

### Proof system (which proof goes where)

Trust signals are layered. Don't dump them all in one place.

| Layer              | What it is                                  | Where to use it                  |
|--------------------|---------------------------------------------|----------------------------------|
| Marken-Proof       | Approbation requirement, CME, Dozent:innen  | Top funnel, hero, brand pages    |
| Angebots-Proof     | Lernziele, Aufbau, Format, nächster Schritt | Course cards, course pages       |
| Leistungs-Proof    | Reviews, Wiederbuchungen, Fallbeispiele     | Retargeting, sales sections      |
| Vertrauens-Proof   | CME-Punkte, Termine, Preis, FAQ             | Just before/at checkout          |

Leistungs-Proofs are used **only** when real and verifiable. Never
fabricate to fill a slot.

### Hooks (first two seconds)

Group by motivation. Pick one motivation per asset.

**Risikoreduktion**
- Komplikationen beginnen oft mit der falschen Entscheidung.
- Nicht jede Nachfrage ist eine Indikation.
- Aufklärung schützt medizinisch, juristisch und menschlich.

**Kompetenzaufbau**
- Die beste Technik ist die, die Du begründen kannst.
- Spritzen kann jede:r. Entscheidungen sicher treffen nur wenige.
- Anatomie ist nicht optional.

**Selbstbestimmung**
- Du hast Medizin studiert. Nicht Schichtdienst.
- Ein zweites Standbein braucht mehr als einen Wochenendkurs.
- Privatpraxis beginnt mit Kompetenz.

**Haltung**
- Wer alles injiziert, entscheidet nichts.
- Ästhetische Medizin ist kein Reparaturbetrieb.
- Indikation vor Intervention.

### Copy-Bauplan

Every long-form unit (landing section, course page, ad set, post,
email body) follows this order:

> Haltung → medizinische Logik → Outcome → Proof → CTA

1. **Haltung.** What do we stand for in this piece?
2. **Medizinische Logik.** Which clinical decision/structure is at the center?
3. **Outcome.** What can the physician do better, more safely, more clearly afterwards?
4. **Proof.** Why is she allowed to believe it? (pick the right proof layer)
5. **CTA.** What is the next sensible step?

Short formats (single-image ad, push notification, badge) may compress
to *Haltung → Outcome → CTA*, but never skip Haltung.

### Do & Don't (quick reference)

| Don't say                                  | Say instead                                              |
|--------------------------------------------|----------------------------------------------------------|
| Boost dein Wissen.                         | Bau Dein Wissen strukturiert auf.                        |
| Perfekte Ergebnisse.                       | Nachvollziehbare Entscheidungen und sichere Behandlung.  |
| Starte mit einem neuen Skill.              | Vom ersten Kurs zur eigenen Praxis.                      |
| Beauty mit Verantwortung.                  | Ästhetische Medizin mit Haltung.                         |
| Easy Pro für ästhetische Medizin werden.   | Lerne ästhetische Medizin. Aber medizinisch.             |

### Hard exclusions

- No Vorher/Nachher imagery and no Vorher/Nachher copy framing.
- No patient-facing tone. EPHIA addresses **Ärzt:innen**, never Endkund:innen.
- No "Botox" on main pages (allowed only on performance landing pages, see memory).
- No promised outcomes. EPHIA promises decision capability, not results.
- No "Mentoring", "Support", "Begleitung", "Community" unless that exact service is defined and delivered.

---

## Do-not list

- Do not introduce new hex values. Add them here first.
- Do not use hyphen dashes `-` or em/en dashes as sentence punctuation
  in user-facing copy (use commas, periods, or rephrase). This rule
  applies to every rendered string.
- Do not use the words "Ärzte" / "Patienten" / "Probanden" / "Dozenten"
  — always gender with a colon: "Ärzt:innen", "Patient:innen",
  "Proband:innen", "Dozent:innen".
- Do not use browser-native `confirm()` / `alert()` / `prompt()` — use
  app-native modals.
- Do not use emojis in UI copy unless explicitly requested.
