-- Add the missing columns to your existing table
alter table public.products add column if not exists description text;
alter table public.products add column if not exists embedding_input text;
alter table public.products add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- This command forces Supabase to refresh its schema cache immediately!
NOTIFY pgrst, 'reload schema';
