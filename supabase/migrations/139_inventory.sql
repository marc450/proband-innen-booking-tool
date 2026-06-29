-- Schrankbestand / inventory per course location.
--
-- Three tables:
--   inventory_locations  one row per physical course location (HYSTUDIO …)
--   inventory_items      current stock, one row per product per location
--   inventory_changes    append-only history of every quantity change
--
-- Every stock change goes through apply_inventory_change(), which updates the
-- item AND writes an immutable inventory_changes row in a single transaction,
-- capturing who made the change and when. The changes table is never updated
-- or deleted from the app, so the history stays trustworthy.
--
-- All staff (admin + nutzer) may read and adjust. Writes flow through the
-- service-role API route /api/inventory/adjust, which resolves the real user
-- via getVerifiedAccess() and passes it as p_user_id.

-- ── Locations ──────────────────────────────────────────────────────────
create table if not exists public.inventory_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  address     text,
  created_at  timestamptz not null default now()
);

-- ── Items (current stock) ──────────────────────────────────────────────
create table if not exists public.inventory_items (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid not null references public.inventory_locations(id) on delete cascade,
  product_family  text not null,
  product_name    text not null,
  quantity        integer not null default 0 check (quantity >= 0),
  sort_order      integer not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null,
  unique (location_id, product_family, product_name)
);

create index if not exists inventory_items_location_idx
  on public.inventory_items(location_id);

-- ── Changes (append-only history) ──────────────────────────────────────
create table if not exists public.inventory_changes (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.inventory_items(id) on delete cascade,
  location_id      uuid not null references public.inventory_locations(id) on delete cascade,
  changed_by       uuid references public.profiles(id) on delete set null,
  quantity_before  integer not null,
  quantity_after   integer not null,
  delta            integer not null,
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists inventory_changes_item_idx
  on public.inventory_changes(item_id);
create index if not exists inventory_changes_location_created_idx
  on public.inventory_changes(location_id, created_at desc);

-- ── Data API access ────────────────────────────────────────────────────
-- Admin tool only: nothing for anon. authenticated gets read (server reads
-- use the service-role client, but grant select for any future client read).
-- Writes go through the service-role RPC, so authenticated needs no write.
grant select on public.inventory_locations to authenticated;
grant select, insert, update, delete on public.inventory_locations to service_role;

grant select on public.inventory_items to authenticated;
grant select, insert, update, delete on public.inventory_items to service_role;

-- History is read-only from the app; inserts happen only inside the RPC.
grant select on public.inventory_changes to authenticated;
grant select, insert on public.inventory_changes to service_role;

alter table public.inventory_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_changes enable row level security;

drop policy if exists "inventory_locations staff read" on public.inventory_locations;
create policy "inventory_locations staff read" on public.inventory_locations
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "inventory_items staff read" on public.inventory_items;
create policy "inventory_items staff read" on public.inventory_items
  for select to authenticated using (auth.uid() is not null);

drop policy if exists "inventory_changes staff read" on public.inventory_changes;
create policy "inventory_changes staff read" on public.inventory_changes
  for select to authenticated using (auth.uid() is not null);

-- ── Atomic stock change + history write ────────────────────────────────
-- Sets a new absolute quantity, logs the delta, attributes it to p_user_id.
-- Returns the new inventory_changes.id, or null when the quantity is
-- unchanged (no history row written). Locks the item row to keep concurrent
-- edits from racing.
create or replace function public.apply_inventory_change(
  p_item_id      uuid,
  p_new_quantity integer,
  p_note         text,
  p_user_id      uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item    public.inventory_items%rowtype;
  v_change  uuid;
begin
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select * into v_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'INVENTORY_ITEM_NOT_FOUND';
  end if;

  -- Nothing to do: leave the item and history untouched.
  if v_item.quantity = p_new_quantity then
    return null;
  end if;

  update public.inventory_items
     set quantity = p_new_quantity,
         updated_at = now(),
         updated_by = p_user_id
   where id = p_item_id;

  insert into public.inventory_changes
    (item_id, location_id, changed_by, quantity_before, quantity_after, delta, note)
  values
    (v_item.id, v_item.location_id, p_user_id, v_item.quantity, p_new_quantity,
     p_new_quantity - v_item.quantity, nullif(btrim(p_note), ''))
  returning id into v_change;

  return v_change;
end;
$$;

grant execute on function public.apply_inventory_change(uuid, integer, text, uuid)
  to service_role, authenticated;

-- ── Seed: HYSTUDIO Berlin Mitte + current Schrankbestand ───────────────
do $$
declare
  v_loc uuid;
  v_item uuid;
  r record;
begin
  insert into public.inventory_locations (name, address)
  values ('HYSTUDIO Berlin Mitte', 'Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland')
  on conflict (name) do update set address = excluded.address
  returning id into v_loc;

  for r in
    select * from (values
      ('Filler',        'Refyne',       7,  10),
      ('Filler',        'Defyne',       10, 20),
      ('Filler',        'Restylane',    29, 30),
      ('Filler',        'Volyme',       13, 40),
      ('Filler',        'Kysse',        4,  50),
      ('Filler',        'Lyft',         1,  60),
      ('Skinbooster',   'Vital',        9,  70),
      ('Skinbooster',   'Vital light',  6,  80),
      ('Biostimulator', 'Sculptra',     19, 90),
      ('Botulinum',     'Relfydess',    19, 100),
      ('Cap',           'Schwarz',      21, 110),
      ('Cap',           'Beige',        18, 120)
    ) as t(family, name, qty, sort_ord)
  loop
    insert into public.inventory_items
      (location_id, product_family, product_name, quantity, sort_order)
    values (v_loc, r.family, r.name, r.qty, r.sort_ord)
    on conflict (location_id, product_family, product_name) do nothing
    returning id into v_item;

    -- Log the seeded starting stock as the first history entry
    -- (changed_by null = System / Anfangsbestand). Only when freshly inserted.
    if v_item is not null then
      insert into public.inventory_changes
        (item_id, location_id, changed_by, quantity_before, quantity_after, delta, note)
      values (v_item, v_loc, null, 0, r.qty, r.qty, 'Anfangsbestand');
    end if;
  end loop;
end $$;
