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
