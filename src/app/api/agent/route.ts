import { NextResponse } from "next/server";
import { geminiEmbed, geminiText } from "@/lib/gemini";
import { matchProducts } from "@/lib/supabase";
import type { AgentRequest, AgentResponse } from "@/lib/types";

const FALLBACK_REASONING =
  "Found 0 casual items suitable for current conditions in your area.";

function buildReasoningPrompt(query: string): string {
  return [
    "You are a fashion assistant.",
    "Return exactly one sentence using this template:",
    '"Found {count} {formality} items suitable for {weather_desc} in {location}."',
    "If any field is unknown, use these defaults:",
    "count=0, formality=casual, weather_desc=current conditions, location=your area.",
    `User query: ${query}`,
  ].join("\n");
}

export async function POST(request: Request) {
  let payload: AgentRequest | null = null;

  try {
    payload = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = payload?.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  let reasoning = FALLBACK_REASONING;
  let products: AgentResponse["products"] = [];

  try {
    const embedding = await geminiEmbed(query);
    const matches = await matchProducts({ embedding, matchCount: 5 });
    products = matches.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      category: item.category,
      product_url: item.product_url,
      image_url: item.image_url,
      badges: buildBadges(item.attributes ?? {}),
      similarity: item.similarity,
    }));
  } catch {
    products = [];
  }

  try {
    const draft = await geminiText(buildReasoningPrompt(query));
    if (draft.toLowerCase().startsWith("found")) {
      reasoning = draft;
    }
  } catch {
    reasoning = FALLBACK_REASONING;
  }

  const response: AgentResponse = {
    products,
    reasoning,
    tool_calls_log: [],
    payment_plan: null,
    track: "A",
  };

  return NextResponse.json(response);
}

function buildBadges(attributes: Record<string, unknown>): string[] {
  const badges: string[] = [];
  const wind = attributes.wind_resistance === true;
  const waterproof = attributes.waterproof === true;
  const tempRange = typeof attributes.temp_range === "string" ? attributes.temp_range : "";
  const formality = typeof attributes.formality === "string" ? attributes.formality : "";

  if (wind) badges.push("Windproof");
  if (waterproof) badges.push("Waterproof");
  if (tempRange) badges.push(capitalize(tempRange));
  if (formality) badges.push(capitalize(formality.replace("_", " ")));

  return badges.slice(0, 3);
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
