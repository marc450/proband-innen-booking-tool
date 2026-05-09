// Plain-text cleanup helpers for Gmail-derived strings.
//
// Used in two places where text from Gmail needs to render cleanly
// without leaking raw HTML tags or entity references:
//   • Slack inbox notification preview — src/app/api/cron/gmail-poll/route.ts
//   • Inbox thread-list snippet — src/app/api/gmail/threads/route.ts
//
// Gmail's `snippet` field is supposed to be plain text, but in practice
// it can contain inline tags (e.g. "<b>...</b>") and HTML entities
// (e.g. "&nbsp;") when the source email's body had them in the plain
// part. Slack and our inbox UI both render snippets as plain text, so
// the markup leaks visibly.

// Decode the common named entities plus numeric (decimal and hex)
// character refs. Order matters: &amp; is decoded LAST so a literal
// "&nbsp;" in the source (encoded "&amp;nbsp;") stays as "&nbsp;"
// rather than being recursively expanded.
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([\da-f]+);/gi, (_, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/g, "&");
}

// Strip HTML tags and decode entities, collapse whitespace, trim.
// Suitable for a Gmail snippet on its way to a plain-text surface.
export function cleanGmailSnippet(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
