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

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products_hybrid`, {
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

export async function getProductById(id?: string): Promise<MatchProductRow | null> {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase env vars");
  }

  const trimmedId = id?.trim();
  if (!trimmedId) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(trimmedId)}&select=id,name,price,category,product_url,image_url,attributes,tags`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch product:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.length > 0 ? (data[0] as MatchProductRow) : null;
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
