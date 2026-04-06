"use client";

import { useState, useCallback } from "react";

type SortDir = "asc" | "desc";

export function useTableSort<K extends string>(
  defaultKey: K,
  defaultDir: SortDir = "asc"
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const handleSort = useCallback(
    (key: K) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  return { sortKey, sortDir, handleSort };
}
