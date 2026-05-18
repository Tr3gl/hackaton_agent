import fs from "fs";
async function run() {
  const env = fs.readFileSync(".env.local", "utf8");
  env.split("\n").forEach(line => {
    if (line && !line.startsWith("#")) {
      const [k, ...v] = line.split("=");
      if(v.length) process.env[k.trim()] = v.join("=").replace(/^["']|["']$/g, "").trim();
    }
  });

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/match_products_hybrid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      query_embedding: JSON.stringify(Array(768).fill(0.1)),
      match_count: 5,
      filter: {}
    }),
  });
  console.log(response.status);
  console.log(await response.text());
}
run();
