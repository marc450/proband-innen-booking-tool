"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import type { CurriculumConfig } from "@/lib/curricula";

interface Props {
  curriculum: CurriculumConfig;
}

export function CurriculumBanner({ curriculum }: Props) {
  const handleClick = () => {
    const url = `/courses/curriculum/${curriculum.slug}`;
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  return (
    <div className="mt-16 max-w-2xl mx-auto">
      <button
        onClick={handleClick}
        className="w-full bg-white/10 backdrop-blur-sm rounded-[10px] p-6 text-left hover:bg-white/15 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-lg mb-1">
              Dieses Kursangebot ist Teil des {curriculum.title}
            </p>
            <p className="text-white/80 text-sm">
              Spare {curriculum.discountPercent}% mit dem Komplettpaket
            </p>
          </div>
          <div className="flex-shrink-0 text-white/80 group-hover:text-white transition-colors">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
      </button>
    </div>
  );
}
