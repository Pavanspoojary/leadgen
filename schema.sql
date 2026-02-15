-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- LEADS TABLE
create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  business_name text not null,
  industry text,
  location text,
  website_url text,
  website_status text,
  source_platform text,
  email text,
  notes text,
  contact_info jsonb default '{}'::jsonb,
  market_scan jsonb default '{}'::jsonb
);

-- AUDITS TABLE
create table audits (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  performance_score int,
  seo_score int,
  conversion_score int,
  branding_score int,
  trust_score int,
  digital_maturity_index int,
  primary_opportunity text,
  raw_data jsonb -- Store full JSON details here for UI retrieval
);

-- OUTREACH TABLE
create table outreach (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  tone text,
  subject text,
  body text,
  follow_up_stage int default 1,
  next_follow_up_date timestamp with time zone,
  response_received boolean default false,
  sequence_data jsonb -- Store the full generated sequence
);

-- AI LOGS TABLE
create table ai_logs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  provider text,
  token_usage int,
  error_type text,
  status text
);

-- RLS POLICIES
alter table leads enable row level security;
alter table audits enable row level security;
alter table outreach enable row level security;
alter table ai_logs enable row level security;

-- Policy: Only authenticated users can access (Private SaaS)
create policy "Enable access for authenticated users only" on leads for all to authenticated using (true) with check (true);
create policy "Enable access for authenticated users only" on audits for all to authenticated using (true) with check (true);
create policy "Enable access for authenticated users only" on outreach for all to authenticated using (true) with check (true);
create policy "Enable access for authenticated users only" on ai_logs for all to authenticated using (true) with check (true);
