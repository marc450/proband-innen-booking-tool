-- One-time data cleanup: NULL out "no title" placeholder strings that were
-- stored verbatim in auszubildende.title (e.g. the "Kein Titel" dropdown
-- option, plus "Keine"/"Keiner" from legacy Heilpraktiker:innen imports and
-- bare dashes). These leaked into composed names like "Keine Bernadette
-- Kirzinger". Going forward the write endpoints normalise via
-- normalizeTitle() in src/lib/utils.ts, so this only fixes existing rows.
update public.auszubildende
set title = null
where lower(btrim(title)) in ('kein titel', 'kein', 'keine', 'keiner', '-', '—', '–');
