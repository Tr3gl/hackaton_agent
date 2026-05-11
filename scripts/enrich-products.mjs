import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL = "gemini-2.0-flash";
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
    csv: "../products_extracted_local.csv",
    images: "../public/images",
    out: "./data/enriched-products.json",
    limit: 0,
    sleep: DEFAULT_SLEEP_MS,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--") || !value) continue;
    const normalized = key.slice(2);
    if (normalized === "csv") args.csv = value;
    if (normalized === "images") args.images = value;
    if (normalized === "out") args.out = value;
    if (normalized === "limit") args.limit = Number(value) || 0;
    if (normalized === "sleep") args.sleep = Number(value) || DEFAULT_SLEEP_MS;
  }

  return args;
}

function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      current.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      current.push(field);
      field = "";
      if (current.length > 1 || current[0] !== "") {
        rows.push(current);
      }
      current = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? "";
    });
    return entry;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickImageValue(row) {
  const keys = Object.keys(row);
  const direct = ["image_url", "local_image"];
  for (const key of direct) {
    if (row[key]) return row[key];
  }
  const imageKey = keys.find((key) => key.toLowerCase().startsWith("image"));
  return imageKey ? row[imageKey] : "";
}

async function loadImageBase64(imageValue, imagesDir) {
  if (!imageValue) return null;

  if (imageValue.startsWith("http")) {
    const response = await fetch(imageValue);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString("base64");
  }

  const relative = imageValue.startsWith("/") ? imageValue.slice(1) : imageValue;
  const imagePath = path.resolve(imagesDir, relative.replace(/^images\//, ""));
  if (!fs.existsSync(imagePath)) return null;
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString("base64");
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function buildPrompt(name, category) {
  return [
    "You are a fashion product attribute extractor.",
    "Return ONLY a JSON object, no markdown and no extra text.",
    `Product: ${name}`,
    `Category: ${category}`,
    "Required JSON schema:",
    "{",
    "  \"temp_range\": \"cold|cool|mild|warm|hot\",",
    "  \"wind_resistance\": true|false,",
    "  \"waterproof\": true|false,",
    "  \"formality\": \"casual|smart_casual|formal\",",
    "  \"occasion\": [\"everyday\",\"outdoor\",\"work\",\"party\",\"wedding\",\"vacation\",\"sport\"],",
    "  \"activity\": [\"walking\",\"office\",\"travel\",\"beach\",\"evening\",\"casual\"],",
    "  \"style\": \"classic|trendy|streetwear|bohemian|minimalist\",",
    "  \"fit\": \"slim|regular|oversized|relaxed\",",
    "  \"season\": [\"spring\",\"summer\",\"autumn\",\"winter\"],",
    "  \"material_feel\": \"lightweight|medium|heavy\",",
    "  \"layering\": \"base|mid|outer\",",
    "  \"color_family\": \"neutral|earth|bright|dark|pastel\",",
    "  \"age_group\": \"teen|young_adult|adult|all\",",
    "  \"breathability\": \"low|medium|high\"",
    "}",
  ].join("\n");
}

function tagsFromAttributes(attributes) {
  if (!attributes) return [];
  const tags = new Set();
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => tags.add(String(item)));
      return;
    }
    tags.add(String(value));
  };

  pushValue(attributes.temp_range);
  pushValue(attributes.formality);
  pushValue(attributes.occasion);
  pushValue(attributes.activity);
  pushValue(attributes.style);
  pushValue(attributes.fit);
  pushValue(attributes.season);
  pushValue(attributes.material_feel);
  pushValue(attributes.layering);
  pushValue(attributes.color_family);
  pushValue(attributes.age_group);
  pushValue(attributes.breathability);
  if (attributes.wind_resistance) tags.add("wind_resistance");
  if (attributes.waterproof) tags.add("waterproof");

  return Array.from(tags);
}

async function callGemini({ apiKey, prompt, imageBase64, model }) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          imageBase64
            ? { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
            : null,
        ].filter(Boolean),
      },
    ],
    generationConfig: { temperature: 0.1 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini error: ${response.status} ${detail}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const json = extractJson(text);
  if (!json) {
    throw new Error("Gemini returned non-JSON response");
  }

  return json;
}

async function main() {
  const args = parseArgs(process.argv);
  const envPath = path.resolve(process.cwd(), ".env.local");
  loadEnvFromFile(envPath);

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY. Add it to .env.local or export it.");
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), args.csv);
  const imagesDir = path.resolve(process.cwd(), args.images);
  const outPath = path.resolve(process.cwd(), args.out);

  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csvText);
  const limit = args.limit > 0 ? Math.min(rows.length, args.limit) : rows.length;

  const existing = new Map();
  if (fs.existsSync(outPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(outPath, "utf8"));
      if (Array.isArray(raw)) {
        raw.forEach((item) => {
          const key = item.product_url || item.name;
          if (key) existing.set(key, item);
        });
      }
    } catch {
      console.warn("Failed to read existing output file, starting fresh.");
    }
  }

  const results = Array.from(existing.values());

  for (let index = 0; index < limit; index += 1) {
    const row = rows[index];
    const name = row.product_name || row.name || "";
    const category = row.category || "";
    const productUrl = row.product_url || row.url || "";

    const key = productUrl || `${name}-${index}`;
    if (existing.has(key)) {
      continue;
    }

    const imageValue = pickImageValue(row);
    const imageBase64 = await loadImageBase64(imageValue, imagesDir);
    if (!imageBase64) {
      console.warn(`Skipping missing image for ${name || key}`);
      continue;
    }

    const prompt = buildPrompt(name, category);

    try {
      const attributes = await callGemini({
        apiKey,
        prompt,
        imageBase64,
        model,
      });
      const tags = tagsFromAttributes(attributes);

      const enriched = {
        name,
        price: row.price || "",
        category,
        product_url: productUrl,
        image_url: imageValue,
        attributes,
        tags,
      };

      existing.set(key, enriched);
      results.push(enriched);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
      console.log(`Enriched ${index + 1}/${limit}: ${name || key}`);
    } catch (error) {
      console.error(`Failed ${name || key}:`, error.message || error);
    }

    await sleep(args.sleep);
  }

  console.log(`Done. Output saved to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
