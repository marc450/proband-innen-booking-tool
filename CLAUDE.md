@AGENTS.md
@BRAND_MANUAL.md

## Conversation Language (Claude → Marc)
- **Always reply to Marc in English**, even though the codebase, brand manual, and all user-facing copy are in German.
- Do NOT drift into German just because the surrounding context (file names, commit messages, prompts, error strings) is German.
- This applies to chat responses, commit messages explaining what changed for Marc, and any other direct communication. The `git log` history with German commit subjects is fine to keep, but the conversational text around it stays English.
- User-facing text in the app, emails, and UI strings stays German per the rules below.

## Language & Tone (User-facing text)
- Always use informal German with "Du" (capital D), e.g. "Deine Buchung", "Dein Termin"
- Gender correctly: "Proband:innen", "Patient:innen", "Ärzt:innen"
- NEVER use any form of dash as punctuation in user-facing communication. This includes em-dash "—", en-dash "–", and hyphen-as-separator " - ". Use commas, periods, or rephrase the sentence instead. Hyphens inside compound words (e.g. "E-Mail", "Follow-up") are fine.
- This rule also applies to Claude's own chat responses: never use "—", "–", or " - " as sentence punctuation when writing to Marc.
- Keep text friendly, clear, and direct

## Database Changes
- ALWAYS notify the user immediately and clearly when a code change requires a SQL migration to be run in Supabase
- List the exact SQL statements to run
- Do NOT proceed with pushing code until the user confirms the migration has been executed

## UI / Modals
- NEVER use browser-native `confirm()`, `alert()`, or `prompt()` dialogs
- Always use app-native modals: shadcn `Dialog`, `AlertDialog`, or the custom `ConfirmDialog` component
- This applies to all confirmation flows (delete, send, status change, etc.)

## Edge Function Deployments
- After modifying any Edge Function, remind the user to redeploy with:
  `supabase functions deploy <function-name>`
- For public-facing functions (create-checkout-session, confirm-booking), use `--no-verify-jwt`
- For staff-only functions (charge-no-show), do NOT use `--no-verify-jwt`

## Admin Registries (keep in sync when adding new emails or pages)
- **New transactional email**: register it in `src/lib/transactional-emails.ts` so it appears under `/dashboard/transactional-emails`. Pick the right `funnel`, mirror the live subject, and provide a `renderSample()` that calls the same template builder the live send uses.
- **New public page**: add it to the appropriate `PageGroup` in `src/app/dashboard/landingpages/page.tsx` so staff can see and click it. Pick the right host (`HOST_MARKETING` for ephia.de, `HOST_PROBAND` for proband-innen.ephia.de) and add the page under an existing group or a new one.
- These two registries are read-only catalogs; the rule is "if the user can receive it or visit it, it must be discoverable in the admin tool".
