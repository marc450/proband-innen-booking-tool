-- Two course_sessions in December 2026 had label_de stored with the
-- English month abbreviation "Dec" instead of the German "Dez". These
-- labels are rendered as crawlable plain text on the public course cards
-- (SEO), so the wrong spelling was user-visible. The session editor's
-- generator (dateToLabelDe, MONTHS_DE) already produces "Dez" correctly;
-- these were stale rows created/edited before that. Fix the data.
update public.course_sessions
set label_de = replace(label_de, '. Dec ', '. Dez ')
where label_de like '%. Dec %';
