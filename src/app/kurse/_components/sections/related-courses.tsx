import Link from "next/link";
import { getCourseContent } from "@/content/kurse";
import { TYPO } from "../typography";

type RelatedCoursesProps = {
  slugs: string[];
  heading?: string;
};

export function RelatedCourses({
  slugs,
  heading = "Diese Kurse könnten Dich auch interessieren",
}: RelatedCoursesProps) {
  const items = slugs
    .map((slug) => {
      const c = getCourseContent(slug);
      if (!c) return null;
      return {
        slug,
        title: (c.breadcrumbLabel || c.hero.heading).replace(/\n/g, " "),
        description: c.hero.subheadline || c.meta.description,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) return null;

  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className={`${TYPO.h2} text-center mb-14`}>{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/kurse/${item.slug}`}
              className="bg-white rounded-[10px] p-6 md:p-7 flex flex-col hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold mb-3 text-black">
                {item.title}
              </h3>
              <p className="text-sm text-black/70 leading-relaxed flex-1 mb-4">
                {item.description}
              </p>
              <span className="text-[#0066FF] font-bold">Zum Kurs →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
