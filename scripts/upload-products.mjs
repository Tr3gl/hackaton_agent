import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL = "gemini-embedding-001";
const DEFAULT_DIMENSIONS = 768;
const DEFAULT_SLEEP_MS = 1200;

const ATTRIBUTE_ORDER = [
  "product_type",
  "item_subtype",
  "gender",
  "temp_range",
  "formality",
  "occasion",
  "activity",
  "style",
  "aesthetic_vibe",
  "fit",
  "season",
  "material_feel",
  "tactile_feel",
  "outfit_role",
  "color_family",
  "pattern",
  "care_level",
  "wrinkle_resistant",
  "size_range",
];

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
      process.env[key] = value.replace(/^['"]|['"]$/g, ""); // Strip quotes
    }
  }
}

function parseArgs(argv) {
  const args = {
    input: "",
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

function buildEmbeddingInput(item) {
  const parts = [];
  if (item.name) parts.push(String(item.name));
  if (item.category) parts.push(String(item.category));
  if (item.description) parts.push(String(item.description));

  const attributes = item.attributes || {};
  const attrParts = [];

  ATTRIBUTE_ORDER.forEach((key) => {
    const value = attributes[key];
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      attrParts.push(`${key.replace(/_/g, " ")}: ${value.join(", ")}`);
      return;
    }
    if (typeof value === "boolean") {
      if (value) attrParts.push(key.replace(/_/g, " "));
      return;
    }
    attrParts.push(`${key.replace(/_/g, " ")}: ${String(value)}`);
  });

  if (attrParts.length > 0) {
    parts.push(`Attributes: ${attrParts.join("; ")}`);
  }

  return parts.join(". ").trim();
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

async function upsertSupabase({ supabaseUrl, serviceKey, payload }) {
  // Using POST with Prefer: resolution=merge-duplicates to UPSERT based on the primary/unique key (product_url)
  const url = `${supabaseUrl}/rest/v1/products?on_conflict=product_url`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates",
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
  if (!args.input) {
    console.error("Usage: node scripts/upload-products.mjs --input <path_to_json>");
    process.exit(1);
  }

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
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const start = Math.max(0, args.start);
  const limit = args.limit > 0 ? args.limit : items.length - start;
  const end = Math.min(items.length, start + limit);

  for (let index = start; index < end; index += 1) {
    const item = items[index];
    const text = buildEmbeddingInput(item) || item.embedding_input || item.name || "";
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
      
      // Parse price if it's a string like "1.599,99 TL" to a number, or use item.price_numeric if it exists
      let numericPrice = item.price_numeric;
      if (numericPrice === undefined && typeof item.price === "string") {
        // Turkish locale formatting handling: remove dots (thousands), replace comma with dot (decimal)
        const cleaned = item.price.replace(/TL|/g, "").trim().replace(/\./g, "").replace(/,/g, ".");
        numericPrice = Number(cleaned);
      }
      if (isNaN(numericPrice)) numericPrice = 0;

      const payload = {
        name: item.name,
        price: numericPrice,
        category: item.category || item.category_big || "",
        product_url: productUrl,
        image_url: item.image_url || "",
        description: item.description || "",
        attributes: item.attributes || {},
        tags: item.tags || [],
        embedding: embedding,
        embedding_input: text,
      };

      await upsertSupabase({
        supabaseUrl,
        serviceKey,
        payload,
      });
      console.log(`Uploaded ${index + 1}/${end}: ${item.name || productUrl}`);
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
