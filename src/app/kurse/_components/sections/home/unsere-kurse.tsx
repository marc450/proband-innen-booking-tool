"use client";

import { useState } from "react";
import Image from "next/image";
import type { HomeCoursesContent, HomeCourseTile } from "@/content/kurse/home-types";
import { GroupInquiryDialog } from "../group-inquiry-dialog";

export function UnsereKurse({ content }: { content: HomeCoursesContent }) {
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <>
      <section
        id="unsere-kurse"
        className="py-20 md:py-28 scroll-mt-24 md:scroll-mt-28"
        style={{ backgroundColor: "#0066FF" }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide text-white mb-4">
            {content.heading}
          </h2>
          <p className="text-center text-white/90 max-w-2xl mx-auto mb-14 text-base md:text-lg">
            {content.intro}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {content.tiles.map((tile, i) => (
              <CourseTile
                key={`${tile.title}-${tile.audience}-${i}`}
                tile={tile}
                onGroupInquiry={() => setGroupOpen(true)}
              />
            ))}
          </div>
        </div>
      </section>

      <GroupInquiryDialog
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        ctaLabel="Jetzt Anfrage senden"
      />
    </>
  );
}

function CourseTile({
  tile,
  onGroupInquiry,
}: {
  tile: HomeCourseTile;
  onGroupInquiry: () => void;
}) {
  const isGroup = tile.type === "group-inquiry";
  const isExternal = tile.href?.startsWith("http");

  const Body = (
    <div className="flex flex-col h-full p-6 md:p-7">
      <div className="text-center mb-4">
        <div className="text-xs md:text-sm font-semibold tracking-[0.2em] text-[#0066FF] mb-1">
          {tile.kicker}
        </div>
        <h3 className="text-2xl md:text-[1.75rem] font-bold tracking-wide text-black leading-tight">
          {tile.title}
        </h3>
        <div className="text-sm md:text-base font-semibold text-black/75 mt-1">
          {tile.audience}
        </div>
      </div>

      <p className="text-sm md:text-[15px] text-black/75 leading-relaxed mb-6 flex-1">
        {tile.description}
      </p>

      <div className="text-center">
        {isGroup ? (
          <button
            type="button"
            onClick={onGroupInquiry}
            className="inline-block text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
          >
            {tile.ctaLabel}
          </button>
        ) : (
          <a
            href={tile.href}
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-block text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
          >
            {tile.ctaLabel}
          </a>
        )}
      </div>
    </div>
  );

  return (
    <article className="bg-[#FAEBE1] rounded-[10px] overflow-hidden flex flex-col">
      {tile.imagePath ? (
        <div className="relative aspect-[16/10] bg-black/5">
          <Image
            src={tile.imagePath}
            alt={tile.imageAlt ?? `${tile.title} ${tile.audience}`}
            fill
            quality={85}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="aspect-[16/10] flex items-center justify-center"
          style={{ backgroundColor: "#BF785E" }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            PRIVATE KURSE
          </span>
        </div>
      )}
      {Body}
    </article>
  );
}
