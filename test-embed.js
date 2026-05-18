import fs from "fs";

async function run() {
  const env = fs.readFileSync(".env.local", "utf8");
  env.split("\n").forEach(line => {
    if (line && !line.startsWith("#")) {
      const [k, ...v] = line.split("=");
      if(v.length) process.env[k.trim()] = v.join("=").replace(/^["']|["']$/g, "").trim();
    }
  });

  const text = "blue slim jeans";
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    content: { parts: [{ text }] },
    output_dimensionality: 768,
    task_type: "RETRIEVAL_DOCUMENT",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const emb = data?.embedding?.values || [];
  console.log(`Embedding length: ${emb.length}`);
}
run();
