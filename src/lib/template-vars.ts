// Tiny placeholder system for inbox email templates.
//
// Today: only `{{vorname}}` is supported. Add more keys here when needed.
// Tokens are case-insensitive and tolerate inner whitespace
// (`{{ Vorname }}` → resolves the same as `{{vorname}}`). If a token has
// no matching value, the literal token is left in place so the
// composer notices and fills it in by hand instead of sending an empty
// "Hallo ," to a customer.

export interface TemplateVars {
  vorname?: string | null;
}

export const TEMPLATE_VAR_KEYS = ["vorname"] as const;

const TOKEN_RE = /\{\{\s*([a-zA-ZäöüÄÖÜß_]+)\s*\}\}/g;

export function resolveTemplateVars(
  text: string,
  vars: TemplateVars,
): string {
  if (!text) return text;
  return text.replace(TOKEN_RE, (match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    if (key === "vorname") {
      const v = (vars.vorname ?? "").trim();
      return v.length > 0 ? v : match;
    }
    return match;
  });
}
