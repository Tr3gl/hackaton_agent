const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768;

export async function geminiText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini error: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const model = process.env.GEMINI_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
      output_dimensionality: EMBED_DIMENSIONS,
      task_type: "RETRIEVAL_QUERY",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini embed error: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };

  if (!data.embedding?.values) {
    throw new Error("Gemini embed response missing values");
  }

  return data.embedding.values;
}
