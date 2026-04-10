# /kurse Post-Launch Optimizations & Todos

Running list of things to improve on the standalone /kurse landing pages after the initial launch. Not urgent, not blocking. Picked up over time.

---

## Analytics & Tracking

- [ ] **GA4**: add a measurement ID + pageview tracking. Either reuse the same ID the LW site uses (enable cross-domain tracking if still running LW in parallel) or create a dedicated property for `proband-innen.ephia.de`.
- [ ] **Meta Pixel**: if running paid social ads, wire up PageView + Purchase events. Purchase fires from the Stripe webhook or the `/success` page.
- [ ] **Conversion events**: `course_view`, `kursangebote_scroll`, `booking_start` (when a card CTA is clicked), `booking_complete` (Stripe success).
- [ ] **Heatmap**: Hotjar or Microsoft Clarity (free) to see how far people scroll and what they click. Clarity is probably the pragmatic pick.
- [ ] **UTM parsing + attribution**: capture `utm_source/medium/campaign` on first visit, store in localStorage or as a cookie, attach to the `course_bookings` row on purchase so we know which channel converts.

## A/B tests (only once baseline is measured)

- [ ] Hero headline variants
- [ ] Hero CTA label ("Zu den Kursangeboten" vs. "Jetzt buchen" vs. "Termine ansehen")
- [ ] Sticky mobile booking CTA bar at the bottom of the viewport
- [ ] Testimonial position (above vs. below FAQ)
- [ ] Price presentation (EUR vs. €, with/without crossed-out "original" price)

## Performance

- [ ] Replace `<img>` with Next.js `<Image>` in `lernplattform.tsx` and `testimonials.tsx` for automatic AVIF/WebP + responsive srcset
- [ ] Generate responsive video renditions (720p, 1080p) and serve via `<source media="...">` to avoid sending 1080p to mobile
- [ ] Preload the hero poster image (`<link rel="preload" as="image">`) for a better LCP
- [ ] Measure LCP, CLS, INP on mobile (Lighthouse + CrUX once enough real traffic)

## SEO

- [ ] Submit `/kurse/grundkurs-botulinum` to Google Search Console once live
- [ ] Add JSON-LD structured data: `Course` schema with provider, description, hasCourseInstance, offers
- [ ] `sitemap.xml` route that lists all `/kurse/<slug>` URLs
- [ ] `robots.txt` allowing crawl of `/kurse/*`
- [ ] 301 redirect old LW URL (`ephia.de/grundkurs-botulinum`) → new URL once the LW page is retired

## Header / Navigation

- [ ] Wire real dropdown menus behind `Unsere Kurse` and `Über EPHIA` (currently render a chevron but link straight to the LW overview pages). Content should mirror the LW sub-nav (all courses, about, team, etc.).
- [ ] Mobile: collapsible sub-sections for the two dropdown items instead of plain links.

## UX polish

- [ ] Sticky mobile booking CTA (the pattern where a small "Ab EUR 495 · Buchen" bar sticks to the bottom of the screen on scroll)
- [ ] Sub-hero trust bar: row of logos / "bereits X Ärzt:innen haben teilgenommen" / "Ärztekammer-akkreditiert"
- [ ] Anchor links in the header nav that jump to sections of the current landing page
- [ ] Keyboard navigation audit on all accordions (FAQ + Inhalt)
- [ ] Reduced-motion respect for autoplay videos (pause when `prefers-reduced-motion`)
- [ ] Deep-link state for the Inhalt accordion (e.g. `#inhalt-3` opens chapter 3)

## Internationalization

- [ ] English variant at `/en/courses/grundkurs-botulinum`? Only if there's demand from non-German-speaking doctors.

## Migration from LW

- [ ] Once the new page is proven (≥ 2 weeks of stable conversion), update the LW `/grundkurs-botulinum` page to redirect to the new URL, or unpublish the LW page entirely.
- [ ] Keep the old `/courses/[courseKey]` widget alive until ALL courses are migrated, then retire it.

## Content operations

- [ ] Build a simple admin UI to edit course landing content without touching `src/content/kurse/*.ts`? Only if non-devs need to edit copy regularly. Until then, Git is fine.
- [ ] Preview mode: a `/kurse/<slug>?preview=1` route that reads from a draft branch or a Supabase table so the marketing team can preview changes before merging.

## Testimonials

- [ ] Replace placeholder testimonials in `src/content/kurse/grundkurs-botulinum.ts` with real ones + headshots
- [ ] Build a light admin flow to collect new testimonials after each course (email to participants with a form)
