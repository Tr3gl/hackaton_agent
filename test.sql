create or replace function public.match_products_hybrid_test(
  query_embedding vector(768),
  match_count int default 20
)
returns table (
  id uuid,
  similarity float
)
language sql stable as $$
  select
    p.id,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.products p
  where p.embedding is not null
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
