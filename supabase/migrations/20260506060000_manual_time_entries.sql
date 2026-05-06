-- Manual time entries for offline work (meetings, calls, travel, etc.)
create type manual_entry_type as enum ('meeting', 'call', 'travel', 'training', 'offline_work', 'other');
create type manual_entry_status as enum ('pending', 'approved', 'rejected');

create table if not exists manual_time_entries (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  entry_date    date not null,
  started_at    time not null,
  ended_at      time not null,
  duration_minutes integer generated always as (
    extract(epoch from (ended_at - started_at)) / 60
  ) stored,
  entry_type    manual_entry_type not null default 'other',
  description   text not null,
  status        manual_entry_status not null default 'pending',
  reviewed_by   uuid references auth.users(id),
  review_note   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint valid_time_range check (ended_at > started_at),
  constraint max_8h check (extract(epoch from (ended_at - started_at)) / 3600 <= 8)
);

create index on manual_time_entries (tenant_id, user_id, entry_date desc);
create index on manual_time_entries (tenant_id, status);

alter table manual_time_entries enable row level security;

-- Employees can read their own entries
create policy "employee_read_own_manual_time"
  on manual_time_entries for select
  using (auth.uid() = user_id);

-- Employees can insert their own entries
create policy "employee_insert_own_manual_time"
  on manual_time_entries for insert
  with check (auth.uid() = user_id);

-- Employees can cancel (delete) their own pending entries
create policy "employee_delete_own_pending_manual_time"
  on manual_time_entries for delete
  using (auth.uid() = user_id and status = 'pending');

-- Managers can read all entries in their tenant
create policy "manager_read_tenant_manual_time"
  on manual_time_entries for select
  using (
    exists (
      select 1 from users u
      where u.id = auth.uid()
        and u.tenant_id = manual_time_entries.tenant_id
        and u.role in ('manager', 'admin')
    )
  );

-- Managers can update status/review fields
create policy "manager_update_manual_time"
  on manual_time_entries for update
  using (
    exists (
      select 1 from users u
      where u.id = auth.uid()
        and u.tenant_id = manual_time_entries.tenant_id
        and u.role in ('manager', 'admin')
    )
  );
