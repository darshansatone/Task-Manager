-- ==============================================================================
-- TaskMaster Pro - Supabase PostgreSQL Database Schema
-- Migration from MongoDB/Mongoose to Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension for primary keys
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores user accounts, bcrypt hashed passwords, and preferences
-- ------------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  preferences jsonb default '{"theme": "dark", "emailNotifications": true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- Stores user-scoped workspace categories with color codes and icons
-- ------------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(50) not null,
  color varchar(20) default '#6366f1',
  icon varchar(50) default 'tag',
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_user_category unique (user_id, name)
);

-- ------------------------------------------------------------------------------
-- 3. TASKS TABLE
-- Stores tasks with priority, status, deadline, tags, and subtasks checklist
-- ------------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  description text default '',
  status varchar(30) default 'Pending' check (status in ('Pending', 'In Progress', 'Completed')),
  priority varchar(20) default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  category_id uuid references public.categories(id) on delete set null,
  tags jsonb default '[]'::jsonb,
  due_date timestamptz default null,
  reminder boolean default false,
  is_pinned boolean default false,
  is_trash boolean default false,
  subtasks jsonb default '[]'::jsonb,
  user_id uuid not null references public.users(id) on delete cascade,
  completed_at timestamptz default null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 4. ACTIVITY LOGS TABLE
-- Stores user activity audit logs for dashboard timeline
-- ------------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action varchar(50) not null,
  task_title varchar(200) default '',
  details text default '',
  created_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_category_id on public.tasks(category_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_is_trash on public.tasks(is_trash);
create index if not exists idx_tasks_is_pinned on public.tasks(is_pinned);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_logs enable row level security;

-- Service Role Full Access (Used by Express Backend)
create policy "Service role full access on users"
  on public.users for all using (true) with check (true);

create policy "Service role full access on categories"
  on public.categories for all using (true) with check (true);

create policy "Service role full access on tasks"
  on public.tasks for all using (true) with check (true);

create policy "Service role full access on activity_logs"
  on public.activity_logs for all using (true) with check (true);

-- Authenticated Users Policies (If querying directly via Supabase Auth)
create policy "Users can view own profile"
  on public.users for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

create policy "Users manage own categories"
  on public.categories for all using (auth.uid() = user_id);

create policy "Users manage own tasks"
  on public.tasks for all using (auth.uid() = user_id);

create policy "Users view own activity logs"
  on public.activity_logs for select using (auth.uid() = user_id);
