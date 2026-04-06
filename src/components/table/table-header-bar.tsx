"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ReactNode } from "react";

interface Props {
  title: string;
  count?: number;
  countLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Custom filter elements (dropdowns, buttons, etc.) */
  filters?: ReactNode;
  /** Primary action button(s) on the far right */
  actions?: ReactNode;
}

export function TableHeaderBar({
  title,
  count,
  countLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Suchen...",
  filters,
  actions,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
      {/* Left: title + count */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {count !== undefined && (
          <span className="text-sm text-muted-foreground">
            {count} {countLabel || "Einträge"}
          </span>
        )}
      </div>

      {/* Right: search + filters + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchValue || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="!pl-9 h-9 w-[240px]"
            />
          </div>
        )}
        {filters}
        {actions}
      </div>
    </div>
  );
}
