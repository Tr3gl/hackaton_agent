import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL = "gemini-embedding-001";
const DEFAULT_DIMENSIONS = 768;
const DEFAULT_SLEEP_MS = 1200;

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

function parseArgs(argv) {
  const args = {
    input: "./data/products_ready_fixed.json",
    sleep: DEFAULT_SLEEP_MS,
    start: 0,
    limit: 0,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || !value) continue;
    const normalized = key.slice(2);
    if (normalized === "input") args.input = value;
    if (normalized === "sleep") args.sleep = Number(value) || DEFAULT_SLEEP_MS;
    if (normalized === "start") args.start = Number(value) || 0;
    if (normalized === "limit") args.limit = Number(value) || 0;
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedText({ apiKey, model, text }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    content: {
      parts: [{ text }],
    },
    output_dimensionality: DEFAULT_DIMENSIONS,
    task_type: "RETRIEVAL_DOCUMENT",
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

async function updateSupabase({ supabaseUrl, serviceKey, productUrl, payload }) {
  const url = `${supabaseUrl}/rest/v1/products?product_url=eq.${encodeURIComponent(productUrl)}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase error: ${response.status} ${detail}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const envPath = path.resolve(process.cwd(), ".env.local");
  loadEnvFromFile(envPath);

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBED_MODEL || DEFAULT_MODEL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env.local");
    process.exit(1);
  }
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const items = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const start = Math.max(0, args.start);
  const limit = args.limit > 0 ? args.limit : items.length - start;
  const end = Math.min(items.length, start + limit);

  for (let index = start; index < end; index += 1) {
    const item = items[index];
    const text = item.embedding_input || item.name || "";
    const productUrl = item.product_url;

    if (!productUrl) {
      console.warn(`Skipping row ${index + 1}: missing product_url`);
      continue;
    }

    if (!text) {
      console.warn(`Skipping row ${index + 1}: missing embedding_input`);
      continue;
    }

    try {
      const embedding = await embedText({ apiKey, model, text });
      await updateSupabase({
        supabaseUrl,
        serviceKey,
        productUrl,
        payload: {
          embedding,
          embedding_input: text,
        },
      });
      console.log(`Embedded ${index + 1}/${end}: ${item.name || productUrl}`);
    } catch (error) {
      console.error(`Failed ${index + 1}/${end}:`, error.message || error);
    }

    if (args.sleep > 0) {
      await sleep(args.sleep);
    }
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
