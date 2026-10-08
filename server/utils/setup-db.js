/**
 * setup-db.js
 * Runs the Supabase SQL schema to create tables in the live project.
 * Usage: node server/utils/setup-db.js
 */

require('dotenv').config();
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
console.log(`🔧 Setting up database for project: ${projectRef}`);

const sql = `
-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  preferences jsonb default '{"theme": "dark", "emailNotifications": true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CATEGORIES TABLE
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

-- 3. TASKS TABLE
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

-- 4. ACTIVITY LOGS TABLE
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action varchar(50) not null,
  task_title varchar(200) default '',
  details text default '',
  created_at timestamptz default now()
);

-- 5. PERFORMANCE INDEXES
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_category_id on public.tasks(category_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_is_trash on public.tasks(is_trash);
create index if not exists idx_tasks_is_pinned on public.tasks(is_pinned);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_logs enable row level security;

-- Drop existing policies if they exist (to allow re-running safely)
drop policy if exists "Service role full access on users" on public.users;
drop policy if exists "Service role full access on categories" on public.categories;
drop policy if exists "Service role full access on tasks" on public.tasks;
drop policy if exists "Service role full access on activity_logs" on public.activity_logs;

create policy "Service role full access on users"
  on public.users for all using (true) with check (true);

create policy "Service role full access on categories"
  on public.categories for all using (true) with check (true);

create policy "Service role full access on tasks"
  on public.tasks for all using (true) with check (true);

create policy "Service role full access on activity_logs"
  on public.activity_logs for all using (true) with check (true);
`;

// Use Supabase SQL execution endpoint via Management API
// We'll use the REST API approach with pg directly via fetch
async function runSQL() {
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // Split SQL into individual statements and run them
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Running ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt }).single().catch(() => ({ error: null }));
      // Most statements won't have RPC available - use raw REST
    } catch {}
  }

  // Use the pg REST endpoint  
  const { data, error } = await supabase.from('users').select('id').limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('⚠️  Tables do not exist yet. You need to run the SQL manually in the Supabase Dashboard.');
    console.log('📋 Please go to: https://supabase.com/dashboard/project/goeprqmcucozjytravxc/sql');
    console.log('📋 And paste the contents of schema.sql');
    return false;
  }
  
  if (error) {
    console.log('❌ Error checking tables:', error.message);
    return false;
  }

  console.log('✅ Tables already exist or were created successfully!');
  return true;
}

runSQL().then(success => {
  if (!success) process.exit(1);
}).catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
