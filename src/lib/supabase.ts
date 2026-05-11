export interface MatchProductsParams {
  embedding: number[];
  matchCount?: number;
  filter?: Record<string, unknown>;
}

export interface MatchProductRow {
  id: string;
  name: string;
  price: number;
  category: string;
  product_url: string;
  image_url: string;
  attributes: Record<string, unknown> | null;
  tags: string[] | null;
  similarity: number;
}

export async function matchProducts({
  embedding,
  matchCount = 5,
  filter = {},
}: MatchProductsParams): Promise<MatchProductRow[]> {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY)");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products_rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
      filter,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase match error: ${response.status} ${detail}`);
  }

  return (await response.json()) as MatchProductRow[];
}

function normalizeSupabaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (trimmed.includes("supabase.com/dashboard/project/")) {
    const match = trimmed.match(/supabase\.com\/dashboard\/project\/([^/]+)/);
    if (match?.[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }
  return trimmed;
}
