"use client";

import { useEffect } from "react";

// Stamp `data-bwignore` (Bitwarden), `data-1p-ignore` (1Password) and
// `data-lpignore` (LastPass) onto every input / textarea / contenteditable
// inside the admin app. These attributes are the documented opt-out for
// the major password managers, which would otherwise pop their autofill
// chip on fields like the inbox "An: Name oder E-Mail" recipient
// autocomplete and the campaign composer subject line.
//
// Only mount this in admin layouts (dashboard, mobile admin) — never on
// the /login page or on public-facing booking forms, otherwise the user
// loses password autofill where they actually want it. The component
// targets the closest ancestor matching `[data-dashboard-root]` or
// `[data-admin-root]`, so adding the attribute to a parent layout div
// is enough.
export function SuppressPasswordManagers() {
  useEffect(() => {
    const root =
      document.querySelector("[data-dashboard-root]") ||
      document.querySelector("[data-admin-root]");
    if (!root) return;

    const stamp = (el: Element) => {
      // Skip if already tagged so we don't churn React reconciliation.
      if (el.hasAttribute("data-bwignore")) return;
      el.setAttribute("data-bwignore", "true");
      el.setAttribute("data-1p-ignore", "true");
      el.setAttribute("data-lpignore", "true");
    };

    const SELECTOR = "input, textarea, [contenteditable='true'], [contenteditable='']";

    root.querySelectorAll(SELECTOR).forEach(stamp);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR)) stamp(node);
          node.querySelectorAll?.(SELECTOR).forEach(stamp);
        });
      }
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
