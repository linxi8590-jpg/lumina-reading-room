-- Lumina Reading Room initial schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  title text not null,
  author text,
  source_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  order_index integer not null,
  title text,
  text text not null,
  kind text not null default 'section',
  created_at timestamptz not null default now(),
  unique(book_id, order_index)
);

create table if not exists public.reading_states (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_label text not null default 'owner',
  current_section_index integer not null default 0,
  current_paragraph_index integer not null default 0,
  unlocked_section_index integer not null default 0,
  unlocked_paragraph_index integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(book_id, user_label)
);

create table if not exists public.reading_notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  paragraph_index integer,
  author_type text not null check (author_type in ('user', 'ai')),
  note_type text not null check (note_type in ('reflection', 'highlight', 'quote', 'question', 'review_card')),
  content text not null,
  model_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.connector_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null default 'default',
  can_read boolean not null default true,
  can_write_notes boolean not null default true,
  can_advance_progress boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_sections_book_order on public.sections(book_id, order_index);
create index if not exists idx_notes_book_section on public.reading_notes(book_id, section_id);
create index if not exists idx_reading_states_book on public.reading_states(book_id);

alter table public.books enable row level security;
alter table public.sections enable row level security;
alter table public.reading_states enable row level security;
alter table public.reading_notes enable row level security;
alter table public.connector_tokens enable row level security;

-- MVP note:
-- RLS policies depend on the final auth route.
-- For self-hosted single-user deployments, the server should use the service role key.
-- Do not expose the service role key to the browser.

