-- 127_instructor_fk_on_delete_set_null.sql
-- Fix: "Database error deleting user" when deleting a staff user who is a
-- Dozent:in assigned to a course or course template.
--
-- profiles.id references auth.users(id) ON DELETE CASCADE, so deleting an
-- auth user cascades into a profiles delete. But courses.instructor_id and
-- course_templates.instructor_id were added (migration 072) as
-- "REFERENCES public.profiles(id)" with no ON DELETE clause, i.e. the
-- Postgres default ON DELETE NO ACTION. That blocks the cascade whenever a
-- course/template still points at the instructor's profile, and Supabase
-- Auth surfaces the block as the generic "Database error deleting user".
--
-- Deleting an instructor should not delete or block their courses, it
-- should simply detach them, so switch both FKs to ON DELETE SET NULL.
-- The constraint names are dropped generically (whatever Postgres assigned
-- when the inline column FK was created) so this runs cleanly regardless of
-- the auto-generated name.

do $$
declare
  cn text;
begin
  -- courses.instructor_id
  select con.conname into cn
  from pg_constraint con
  where con.conrelid = 'public.courses'::regclass
    and con.contype = 'f'
    and con.conkey = array[
      (select a.attnum from pg_attribute a
       where a.attrelid = 'public.courses'::regclass
         and a.attname = 'instructor_id')
    ];
  if cn is not null then
    execute format('alter table public.courses drop constraint %I', cn);
  end if;

  alter table public.courses
    add constraint courses_instructor_id_fkey
      foreign key (instructor_id) references public.profiles(id)
      on delete set null;

  -- course_templates.instructor_id
  select con.conname into cn
  from pg_constraint con
  where con.conrelid = 'public.course_templates'::regclass
    and con.contype = 'f'
    and con.conkey = array[
      (select a.attnum from pg_attribute a
       where a.attrelid = 'public.course_templates'::regclass
         and a.attname = 'instructor_id')
    ];
  if cn is not null then
    execute format('alter table public.course_templates drop constraint %I', cn);
  end if;

  alter table public.course_templates
    add constraint course_templates_instructor_id_fkey
      foreign key (instructor_id) references public.profiles(id)
      on delete set null;
end $$;
