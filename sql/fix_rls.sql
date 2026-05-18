-- Включаем RLS
alter table public.products enable row level security;

-- Разрешаем чтение всем (анонимным пользователям)
drop policy if exists "Allow anonymous read access" on public.products;
create policy "Allow anonymous read access" on public.products for select using (true);

-- Обновляем кэш на всякий случай
NOTIFY pgrst, 'reload schema';
