import type { CourseTestimonialsContent } from "@/content/kurse/types";

export function Testimonials({
  content,
}: {
  content: CourseTestimonialsContent;
}) {
  if (!content.items.length) return null;

  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-14">
          {content.heading}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {content.items.map((t, idx) => (
            <figure
              key={`${t.name}-${idx}`}
              className="bg-white rounded-[10px] p-6 md:p-7 flex flex-col"
            >
              {t.photoPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.photoPath}
                  alt={t.name}
                  className="w-16 h-16 rounded-full object-cover mb-4"
                />
              )}
              <blockquote className="flex-1 text-sm md:text-base text-black/80 leading-relaxed mb-5">
                „{t.quote}&ldquo;
              </blockquote>
              <figcaption>
                <div className="font-bold text-black">{t.name}</div>
                <div className="text-sm text-black/60">
                  {t.title}
                  {t.location ? ` · ${t.location}` : ""}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
