import DOMPurify from "isomorphic-dompurify";

// Sanitize inbound email HTML before rendering it via
// dangerouslySetInnerHTML in the inbox / email-history views.
//
// Inbound mail comes from arbitrary senders, so its raw HTML is a
// stored-XSS vector: `<img onerror=...>`, `<svg onload=...>`, `<script>`,
// framed phishing, etc. When a staff member opens the thread on
// admin.ephia.de that payload would run in their authenticated session,
// which can read decrypted PII. DOMPurify strips scripts, event handlers
// and dangerous elements while keeping the presentational markup email
// clients rely on (tables, inline styles, images).
//
// isomorphic-dompurify works in both the server render and the browser,
// so there is no window/SSR hazard and no hydration mismatch.

let hookRegistered = false;

function ensureLinkHook() {
  if (hookRegistered) return;
  // Force every surviving link to open in a new tab without leaking our
  // window via window.opener.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  hookRegistered = true;
}

export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  ensureLinkHook();
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    // DOMPurify already drops <script> and on* handlers; be explicit
    // about the other executable / exfiltration / phishing vectors.
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "base"],
    FORBID_ATTR: ["formaction", "ping"],
  });
}
