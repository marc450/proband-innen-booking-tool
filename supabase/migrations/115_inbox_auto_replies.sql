-- Per-Gmail-Thread Dedup für die Auto-Antwort auf eingehende
-- E-Mails an customerlove@ephia.de. Eine eingehende E-Mail im
-- Thread löst die Auto-Antwort aus, Folge-Mails in demselben
-- Thread bekommen keine erneute Auto-Antwort. Verhindert auch
-- E-Mail-Loops, falls die Gegenseite einen eigenen Auto-Responder
-- aktiv hat.
--
-- Für den Kontaktformular-Pfad gibt es keinen eingehenden Gmail-
-- Thread (das Formular ruft direkt sendInboxAutoReply auf, bevor
-- Gmail überhaupt weiß, dass die Nachricht existiert). Diese Pfade
-- generieren eine synthetische Thread-ID nach dem Schema
-- "contact-form:<email-hash>:<yyyy-mm-dd>" und werden hier eben-
-- falls eingetragen, damit Doppel-Absendungen am selben Tag nicht
-- mehrere ACKs zur Folge haben.

create table public.inbox_auto_replies (
  thread_id text primary key,
  recipient_email text not null,
  sent_at timestamptz not null default now()
);

-- Server-only Tabelle. Der Admin-Client (service_role) ist der einzige
-- Schreiber, deshalb keinerlei anon-Grants. Authenticated bekommt nur
-- select, falls wir später im Dashboard einsehen wollen, wer wann eine
-- Auto-Antwort bekommen hat.
grant select on public.inbox_auto_replies to authenticated;
grant select, insert, update, delete on public.inbox_auto_replies to service_role;

alter table public.inbox_auto_replies enable row level security;

create policy "Authenticated staff can read auto-reply log"
  on public.inbox_auto_replies
  for select
  to authenticated
  using (true);

comment on table public.inbox_auto_replies is
  'Dedup log for the customerlove auto-reply. PK = Gmail thread_id (or synthetic id for contact-form path). One row = one ACK sent.';
