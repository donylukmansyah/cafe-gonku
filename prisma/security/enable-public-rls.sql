-- Cafe Gonku database hardening for Supabase exposed public schema.
-- This is intentionally deny-by-default for PostgREST/API roles.
-- The application accesses these tables through server-side Prisma using the
-- database owner role, while browser Supabase usage is limited to Realtime.

begin;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.verification enable row level security;
alter table public.menus enable row level security;
alter table public.menu_options enable row level security;
alter table public.menu_option_values enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.daily_cash_records enable row level security;
alter table public.accounts enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_logs enable row level security;

-- Extra defense in depth: browser/API roles should not have direct table
-- privileges. If client-side table access is ever needed, add narrow RLS
-- policies and matching grants for only the required table/actions.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on table
      public.users,
      public.sessions,
      public.verification,
      public.menus,
      public.menu_options,
      public.menu_option_values,
      public.order_items,
      public.order_item_options,
      public.daily_cash_records,
      public.accounts,
      public.tables,
      public.orders,
      public.order_logs
    from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on table
      public.users,
      public.sessions,
      public.verification,
      public.menus,
      public.menu_options,
      public.menu_option_values,
      public.order_items,
      public.order_item_options,
      public.daily_cash_records,
      public.accounts,
      public.tables,
      public.orders,
      public.order_logs
    from authenticated;
  end if;
end $$;

commit;
