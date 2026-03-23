@AGENTS.md

## Language & Tone (User-facing text)
- Always use informal German with "Du" (capital D), e.g. "Deine Buchung", "Dein Termin"
- Gender correctly: "Proband:innen", "Patient:innen", "Ärzt:innen"
- NEVER use any form of dash "–" in user-facing communication
- Keep text friendly, clear, and direct

## Database Changes
- ALWAYS notify the user immediately and clearly when a code change requires a SQL migration to be run in Supabase
- List the exact SQL statements to run
- Do NOT proceed with pushing code until the user confirms the migration has been executed

## Edge Function Deployments
- After modifying any Edge Function, remind the user to redeploy with:
  `supabase functions deploy <function-name>`
- For public-facing functions (create-checkout-session, confirm-booking), use `--no-verify-jwt`
- For staff-only functions (charge-no-show), do NOT use `--no-verify-jwt`
