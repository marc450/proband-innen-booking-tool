"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

interface Props {
  label: string;
  sortKey: string;
  currentKey: string;
  direction: "asc" | "desc";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSort: (key: any) => void;
  className?: string;
}

export function SortableHead({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
  className = "",
}: Props) {
  const isActive = currentKey === sortKey;

  return (
    <TableHead
      className={`cursor-pointer select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </TableHead>
  );
}
