-- One-time data cleanup: disambiguate the bare "Dr." title.
-- Some auszubildende rows stored just "Dr.", others "Dr. med." / "Dr. med.
-- dent.", which made composed review names inconsistent. A bare "Dr." can't
-- be classified automatically, so we use the booking history: anyone who
-- booked the Grundkurs Botulinum für Zahnmediziner:innen is a dentist and
-- gets "Dr. med. dent."; every other "Dr." is a physician and gets
-- "Dr. med.". NULL titles, "Prof.", "Dr. PD" and already-correct values are
-- left untouched.

-- 1. Dentist-course doctors: any "Dr…" title becomes "Dr. med. dent."
update public.auszubildende
set title = 'Dr. med. dent.'
where title like 'Dr%'
  and title <> 'Dr. med. dent.'
  and id in (
    select cb.auszubildende_id
    from public.course_bookings cb
    join public.course_templates ct on ct.id = cb.template_id
    where ct.course_key = 'grundkurs_botulinum_zahnmedizin'
      and cb.auszubildende_id is not null
  );

-- 2. Every other bare "Dr." becomes "Dr. med."
update public.auszubildende
set title = 'Dr. med.'
where title = 'Dr.'
  and id not in (
    select cb.auszubildende_id
    from public.course_bookings cb
    join public.course_templates ct on ct.id = cb.template_id
    where ct.course_key = 'grundkurs_botulinum_zahnmedizin'
      and cb.auszubildende_id is not null
  );
