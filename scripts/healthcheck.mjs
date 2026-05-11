import fs from "node:fs";
import path from "node:path";

const DEFAULT_EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768;

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeSupabaseUrl(raw) {
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

async function embedText({ apiKey, model, text }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    content: {
      parts: [{ text }],
    },
    output_dimensionality: EMBED_DIMENSIONS,
    task_type: "RETRIEVAL_QUERY",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Embedding error: ${response.status} ${detail}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error("Embedding response missing values");
  }

  return values;
}

async function matchProducts({ supabaseUrl, anonKey, embedding }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products_rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      query_embedding: JSON.stringify(embedding),
      match_count: 3,
      filter: {},
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase match error: ${response.status} ${detail}`);
  }

  return response.json();
}


async function matchProductsWithLiteral({ supabaseUrl, anonKey, embedding }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products_rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      query_embedding: JSON.stringify(embedding),
      match_count: 3,
      filter: {},
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase match error (db embedding): ${response.status} ${detail}`);
  }

  return response.json();
}

function toVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

async function checkAnonSelect({ supabaseUrl, anonKey }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/products?select=id&limit=1`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase select error: ${response.status} ${detail}`);
  }

  return response.json();
}

async function fetchEmbeddingSample({ supabaseUrl, anonKey }) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/products?select=embedding::text&embedding=not.is.null&limit=1`,
    {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase embedding select error: ${response.status} ${detail}`);
  }

  const rows = await response.json();
  const sample = rows?.[0]?.embedding;
  if (!sample) return null;
  if (typeof sample === "string") {
    const trimmed = sample.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
    const body = trimmed.slice(1, -1).trim();
    if (!body) return null;
    return body.split(",").map((value) => Number(value));
  }
  if (Array.isArray(sample)) return sample;
  return null;
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  loadEnvFromFile(envPath);

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing SUPABASE_ANON_KEY");

  console.log("Healthcheck: embedding...");
  const embedding = await embedText({
    apiKey,
    model,
    text: "warm casual outfit for windy day",
  });

  if (embedding.length !== EMBED_DIMENSIONS) {
    throw new Error(`Embedding dimension mismatch: ${embedding.length}`);
  }
  const nonFinite = embedding.filter((value) => !Number.isFinite(value)).length;
  if (nonFinite > 0) {
    throw new Error(`Embedding contains ${nonFinite} non-finite values`);
  }
  console.log(`Embedding OK: ${embedding.length} dims using ${model}`);

  console.log("Healthcheck: supabase RPC...");
  const matches = await matchProducts({ supabaseUrl, anonKey, embedding });
  console.log(`Supabase OK: ${Array.isArray(matches) ? matches.length : 0} rows returned`);

  console.log("Healthcheck: anon select...");
  const rows = await checkAnonSelect({ supabaseUrl, anonKey });
  console.log(`Anon select OK: ${Array.isArray(rows) ? rows.length : 0} rows returned`);

  console.log("Healthcheck: RPC with DB embedding...");
  const dbEmbedding = await fetchEmbeddingSample({ supabaseUrl, anonKey });
  if (!dbEmbedding) {
    throw new Error("Missing embedding sample from DB");
  }
  const dbMatches = await matchProductsWithLiteral({
    supabaseUrl,
    anonKey,
    embedding: dbEmbedding,
  });
  console.log(`RPC DB embedding OK: ${Array.isArray(dbMatches) ? dbMatches.length : 0} rows returned`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
