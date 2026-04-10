# /kurse Asset Drop Locations

All paths are relative to the project root. Drop files exactly at the paths below so the landing page components can reference them without any code changes.

---

## 1. Logos (shared across all /kurse pages)

| File | Where to drop it | Used by |
|---|---|---|
| `ephia-logo.png` (left-aligned, used in header) | `public/logos/ephia-logo.png` | `src/app/kurse/_components/header.tsx` |
| `ephia-logo-centered.png` (centered, used in footer) | `public/logos/ephia-logo-centered.png` | `src/app/kurse/_components/footer.tsx` |

Recommended size: header logo ~240×80px, footer logo ~240×120px (both 2x of rendered size so they stay sharp on retina). Transparent PNG preferred.

---

## 2. Grundkurs Botulinum specific assets

All go under `public/kurse/grundkurs_botulinum/`.

### Hero (top of page, autoplaying muted video with poster fallback)

| File | Drop at | Notes |
|---|---|---|
| Hero video | `public/kurse/grundkurs_botulinum/hero-video.mp4` | Short loop (10–20s), no audio, compressed H.264 MP4, recommended ≤3MB for fast LCP. Dimensions ~1280×1600 (portrait-ish) since hero aspect is 4/5 on mobile and 4/3 on desktop. |
| Hero poster | `public/kurse/grundkurs_botulinum/hero-poster.jpg` | JPG thumbnail shown before the video loads. Same aspect ratio as the video. ~150–300KB. |

### Lernplattform section (4 features)

Feature 2 ("Realitätsnahe Behandlungen") is a **video**. The other three are static images.

| File | Drop at | Type |
|---|---|---|
| Einfache Navigation | `public/kurse/grundkurs_botulinum/plattform/navigation.jpg` | Image |
| Realitätsnahe Behandlungen | `public/kurse/grundkurs_botulinum/plattform/behandlung.mp4` | Video (autoplay muted loop) |
| Realitätsnahe Behandlungen (poster) | `public/kurse/grundkurs_botulinum/plattform/behandlung-poster.jpg` | Image (shown before video loads) |
| Fachlich hochstehende Inhalte | `public/kurse/grundkurs_botulinum/plattform/inhalte.jpg` | Image |
| Klare Lernziele & Tests | `public/kurse/grundkurs_botulinum/plattform/tests.jpg` | Image |

All images recommended 4:3 aspect ratio, ~1600×1200px, JPG, ≤400KB each.

### OG image (shown when the page is shared on WhatsApp / LinkedIn / etc.)

| File | Drop at |
|---|---|
| Open Graph image | `public/kurse/grundkurs_botulinum/og-image.jpg` |

Recommended: 1200×630 JPG, under 1MB. Should include the course name and the EPHIA logo.

### Testimonials (optional headshots)

If you want round headshots next to each testimonial, drop them under:

`public/kurse/grundkurs_botulinum/testimonials/<first-last>.jpg`

Then set the `photoPath` field in `src/content/kurse/grundkurs-botulinum.ts` for each testimonial.

---

## 3. Content that still needs real text

Open `src/content/kurse/grundkurs-botulinum.ts` and replace:

- **`testimonials.items`** — currently 3 placeholder testimonials (marked with a `TODO` comment). Replace each `quote`, `name`, `title`, `location`, and optionally set `photoPath`.

Everything else (hero, lernziele, kursinhalt chapters, lernplattform, FAQ) is populated with the real text from the existing LW page and should be final.

---

## How videos and images degrade if missing

- **Videos**: the `<video>` tag falls back to showing the `poster` image if the MP4 isn't loadable. If neither exists, you'll see an empty black box but no crash.
- **Images**: Next.js will 404 the image path but the page layout stays intact.

So you can drop assets incrementally without breaking the page.
