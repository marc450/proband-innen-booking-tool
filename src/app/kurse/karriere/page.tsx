import type { Metadata } from "next";
import Script from "next/script";
import { TYPO } from "../_components/typography";

export const metadata: Metadata = {
  title: "Karriere | EPHIA",
  description:
    "Offene Stellen bei EPHIA. Werde Teil der Akademie für verantwortungsvolle ästhetische Medizin und gestalte mit uns neue Bildungsstandards.",
  alternates: { canonical: "https://ephia.de/karriere" },
};

// The join.com widget loads its job listings client-side. It looks for
// `#join-widget` via the `data-mount-in` attribute on its bundle script
// and renders the filterable jobs list inside that div. Bundle URL is a
// signed JWT generated in the join.com dashboard, so this is the only
// integration point we own: swap the URL when join.com regenerates the
// embed, everything else (filters, design tokens, language) lives in
// the JWT payload.
const JOIN_BUNDLE_SRC =
  "https://join.com/api/widget/bundle/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXR0aW5ncyI6eyJzaG93Q2F0ZWdvcnlGaWx0ZXIiOmZhbHNlLCJzaG93TG9jYXRpb25GaWx0ZXIiOmZhbHNlLCJzaG93RW1wbG95bWVudFR5cGVGaWx0ZXIiOmZhbHNlLCJsYW5ndWFnZSI6ImRlIiwiam9ic1BlclBhZ2UiOjI1fSwiam9icyI6e30sImRlc2lnbiI6eyJzaG93TG9nbyI6ZmFsc2UsInNob3dMb2NhdGlvbiI6dHJ1ZSwic2hvd0VtcGxveW1lbnRUeXBlIjp0cnVlLCJzaG93Q2F0ZWdvcnkiOnRydWUsImNvbG9ycyI6eyJ3aWRnZXQiOnsiYmFja2dyb3VuZCI6IiNGRkZGRkYiLCJmaWx0ZXJCb3JkZXIiOiIjRDRENEQ4IiwicGFnaW5hdGlvbiI6IiMyNTYzRUIifSwiam9iQ2FyZCI6eyJzaGFkb3ciOiIjRDRENEQ4IiwiYmFja2dyb3VuZCI6IiNGRkZGRkYiLCJwcmltYXJ5VGV4dCI6IiMzRjNGNDYiLCJzZWNvbmRhcnlUZXh0IjoiIzUyNTI1QiJ9fX0sInZlcnNpb24iOjIsImNvbXBhbnlQdWJsaWNJZCI6Ijg0MTBhZmI1Mjk5ZGYyNjA5YmU0YTViYWVmZjk3N2QwIiwiaWF0IjoxNzc4NzA0MDY1LCJqdGkiOiI1Mzc3OGFhMy1hMjM1LTQ4OTYtOGQyOC1kYzc1Yjc5ZGY5MTkifQ.mR4Slf4gfUl3ZA1-scJ5X9jYuCXA1Pk_9D2MVII158I";

export default function KarrierePage() {
  return (
    <>
      <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h1 className={`${TYPO.h1} text-black`}>Karriere bei EPHIA</h1>
          <p className={`${TYPO.bodyLead} mt-6`}>
            Wir bauen die Akademie für verantwortungsvolle ästhetische Medizin.
            Wenn Du Lust hast, mit uns Bildungsstandards neu zu definieren,
            findest Du unten unsere offenen Stellen.
          </p>
        </div>
      </section>

      <section className="bg-[#FAEBE1] pb-24 md:pb-32">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          {/* The join.com widget's outer wrapper has its background hard-coded
              to #FFFFFF in the signed JWT config. We can't change it without
              regenerating the bundle URL on join.com, so we make every direct
              container inside #join-widget transparent. The job card itself
              keeps its own white background (set deeper in the DOM via
              jobCard.background in the same JWT). */}
          <style>{`
            #join-widget > div,
            #join-widget > div > div:first-child {
              background-color: transparent !important;
              box-shadow: none !important;
            }
          `}</style>
          <div id="join-widget" className="rounded-[10px] overflow-hidden" />
          <Script
            src={JOIN_BUNDLE_SRC}
            data-mount-in="#join-widget"
            strategy="afterInteractive"
          />
          {/* The widget renders a "Alle offenen Stellen bei … ansehen." footer
              link (and a shorter "Alle ansehen." variant on smaller breakpoints)
              that points at the join.com-hosted job board. We hide it via a
              text match so we don't accidentally catch job cards by URL. Runs
              once after the widget mounts and again on every DOM mutation in
              case the widget re-renders (pagination, filters). */}
          <Script id="join-widget-hide-footer" strategy="afterInteractive">{`
            (function () {
              var root = document.getElementById('join-widget');
              if (!root) return;
              function hide() {
                root.querySelectorAll('a').forEach(function (a) {
                  var text = (a.textContent || '').trim();
                  if (/^Alle\\b.*ansehen\\b\\.?$/i.test(text)) {
                    a.style.display = 'none';
                  }
                });
              }
              hide();
              new MutationObserver(hide).observe(root, {
                childList: true,
                subtree: true,
              });
            })();
          `}</Script>
        </div>
      </section>
    </>
  );
}
