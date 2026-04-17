"use client";

import { useEffect } from "react";

/**
 * Applies the dashboard theme class to `document.body` so content rendered
 * via React portals (Dialog, Select, Tooltip, ...) inherits the same dark
 * mode as the dashboard layout. Without this, portals escape the `.dark`
 * wrapper and fall back to :root light-mode CSS variables.
 */
export function DashboardBodyTheme({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (theme === "dark") {
      body.classList.add("dark");
    } else {
      body.classList.remove("dark");
    }
    return () => {
      body.classList.remove("dark");
    };
  }, [theme]);

  return null;
}
