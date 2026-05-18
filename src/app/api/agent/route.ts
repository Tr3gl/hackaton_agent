import { NextResponse } from "next/server";
import { geminiEmbed, extractSearchIntent, curateProducts } from "@/lib/gemini";
import { matchProducts } from "@/lib/supabase";
import { executeTool } from "@/lib/tools";
import { getLocalProductImages, getRemoteProductImages } from "@/lib/server/product-images";
import type {
  AgentRequest,
  AgentResponse,
  ToolCallLog,
  PaymentPlan,
  WeatherData,
  TierName,
  TieredLook,
} from "@/lib/types";

const FALLBACK_REASONING =
  "Here are some items you might like based on your search.";

export async function POST(request: Request) {
  let payload: AgentRequest | null = null;

  try {
    payload = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = payload?.query?.trim();
  const history = payload?.history || [];
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  let reasoning = FALLBACK_REASONING;
  let products: AgentResponse["products"] = [];
  const tool_calls_log: ToolCallLog[] = [];
  let payment_plan: PaymentPlan | null = null;
  let weather: WeatherData | null = null;
  let tieredLooks: TieredLook[] = [];
  let tierProducts = createEmptyTierProducts();
  let tierReasoning = createEmptyTierReasoning();
  let followUpQuestion = "";
  let activeTier: TierName = "better";
  
  // Track A Heuristic: Short query, no obvious occasion/weather keywords
  const isShortQuery = query.split(/\s+/).length <= 4;
  const hasContextKeywords = /wedding|vacation|trip|party|work|office|rain|wind|cold|hot|summer|winter/i.test(query);
  let track: "A" | "B" = (isShortQuery && !hasContextKeywords) ? "A" : "B";

  let intent;
  if (track === "A") {
    // Track A Fast Path: Skip full intent extraction
    intent = {
      semantic_queries: [query],
      filters: {},
      budget: { min: null, max: null },
      garment_types: [],
      location: null,
      reasoning: "Direct matching for your search.",
    };
  } else {
    // Phase 1: Structured Intent Extraction
    intent = await extractSearchIntent(query, history);
    tool_calls_log.push({ 
      tool: "extract_intent", 
      status: "done", 
      summary: `Intent: "${intent.semantic_queries.join(" | ")}" | Filters: ${JSON.stringify(intent.filters)} | Budget: ${intent.budget.min || '∞'}–${intent.budget.max || '∞'} TL`,
      result: intent,
    });
  }

  try {
    // Phase 2: Parallel Fetching (Weather + Multi-Query Embedding)
    let weatherResult: any = null;

    const weatherPromise = intent.location 
      ? executeTool("get_weather", { location: intent.location }).catch(() => null)
      : Promise.resolve(null);
      
    const embedPromises = intent.semantic_queries.map((q: string) => 
      geminiEmbed(q).catch((e: Error) => {
        console.error("Embedding failed", e);
        return [];
      })
    );

    const [weatherData, ...embeddingsArray] = await Promise.all([weatherPromise, ...embedPromises]);
    weatherResult = weatherData;

    if (weatherResult && !weatherResult.error) {
      weather = {
        temp_c: weatherResult.temp_c,
        condition: weatherResult.condition,
        wind_speed: weatherResult.wind_speed,
        location: weatherResult.location || intent.location || "",
      };
      tool_calls_log.push({ 
        tool: "get_weather", 
        status: "done", 
        summary: `${weather.location}: ${weather.temp_c}°C, ${weather.condition}, wind ${weather.wind_speed} km/h` 
      });
    }

    const validEmbeddings = (embeddingsArray as number[][]).filter((e) => e && e.length > 0);
    if (validEmbeddings.length === 0) throw new Error("Failed to get any embeddings");



    // Build Supabase-compatible filters from structured intent
    // We ONLY apply hard constraints (budget, gender) to the DB to avoid 0 matches on small datasets.
    // The semantic search and LLM curation will handle occasion, style, weather, etc.
    const supabaseFilter: Record<string, unknown> = {};
    if (intent.budget.max) supabaseFilter.max_price = intent.budget.max;
    if (intent.budget.min) supabaseFilter.min_price = intent.budget.min;
    if (typeof intent.filters.gender === "string") supabaseFilter.gender = intent.filters.gender;

    // Determine how many results to fetch per query (scale down if many queries to avoid huge payloads)
    const hasAttributeFilters = Object.keys(supabaseFilter).length > 0;
    const fetchCountPerQuery = Math.max(10, Math.floor((hasAttributeFilters ? 80 : 20) / validEmbeddings.length));

    // Broad multi-retrieval using semantic queries + Supabase-supported filters
    const matchPromises = validEmbeddings.map(embedding => 
      matchProducts({ embedding, matchCount: fetchCountPerQuery, filter: supabaseFilter }).catch(() => [])
    );
    const matchesArrays = await Promise.all(matchPromises);
    
    // Flatten and deduplicate matches
    const matches: any[] = [];
    const seenIds = new Set<string>();
    matchesArrays.flat().forEach((m: any) => {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        matches.push(m);
      }
    });

    tool_calls_log.push({ tool: "search_catalog", status: "done", summary: `Found ${matches.length} unique products across ${validEmbeddings.length} semantic queries (with ${Object.keys(supabaseFilter).length} DB filters)` });
    
    // Client-side attribute filtering for fields the Supabase RPC doesn't handle
    const filtered = matches;

    // Phase 3: LLM Curation (Stylist Selection) — pass intent for budget/garment enforcement
    const curationResult = await curateProducts(query, filtered, intent, history);
    const rawLooks = Array.isArray(curationResult?.looks) ? curationResult.looks : [];
    followUpQuestion = typeof curationResult?.follow_up_question === "string" ? curationResult.follow_up_question : "";
    tieredLooks = normalizeLooks(rawLooks);
    tool_calls_log.push({ tool: "curate_products", status: "done", summary: `Built ${tieredLooks.length} coordinated looks.` });

    tierProducts = buildTierProducts(tieredLooks, filtered, matches, intent.reasoning || "");
    tierReasoning = buildTierReasoning(tieredLooks, followUpQuestion);

    activeTier = normalizeTierName((curationResult as any)?.active_tier) || "better";
    products = tierProducts[activeTier];
    reasoning = tierReasoning[activeTier] || FALLBACK_REASONING;

    // Determine Payment Plan
    const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
    if (totalPrice > 0 && track === "B") {
      let purchase_type = "impulse";
      if (intent.filters.occasion?.includes("wedding") || intent.filters.occasion?.includes("vacation")) {
        purchase_type = "life_event";
      } else if (totalPrice > 4000) {
        purchase_type = "planned";
      }

      const paymentResult = await executeTool("suggest_payment_plan", { total: totalPrice, purchase_type });
      tool_calls_log.push({ 
        tool: "suggest_payment_plan", 
        status: "done", 
        summary: `Suggested payment plan: ${paymentResult.scheme}` 
      });

      payment_plan = {
        type: paymentResult.scheme,
        total: paymentResult.total || totalPrice,
        monthly: paymentResult.monthly,
        label: paymentResult.label,
        savings_tip: paymentResult.savings_tip
      };
    }
  } catch (err) {
    console.error("Search Pipeline Error:", err);
    products = [];
  }

  const response: AgentResponse = {
    products,
    reasoning,
    tool_calls_log,
    payment_plan,
    weather,
    track,
    tier_products: tierProducts,
    tier_reasoning: tierReasoning,
    looks: tieredLooks,
    active_tier: activeTier,
    follow_up_question: followUpQuestion || undefined,
  };

  return NextResponse.json(response);
}

function normalizeTierName(value: unknown): TierName | null {
  if (value === "good" || value === "better" || value === "best") return value;
  return null;
}

function createEmptyTierProducts(): Record<TierName, AgentResponse["products"]> {
  return { good: [], better: [], best: [] };
}

function createEmptyTierReasoning(): Record<TierName, string> {
  return { good: FALLBACK_REASONING, better: FALLBACK_REASONING, best: FALLBACK_REASONING };
}

function normalizeLooks(rawLooks: any[]): TieredLook[] {
  if (!Array.isArray(rawLooks)) return [];

  const tiered: TieredLook[] = [];
  rawLooks.forEach((look) => {
    const lookName = typeof look?.look_name === "string" ? look.look_name : "Look";

    if (look?.tiers) {
      const good = normalizeLookTier(look.tiers.good);
      const better = normalizeLookTier(look.tiers.better);
      const best = normalizeLookTier(look.tiers.best);
      if (good && better && best) {
        tiered.push({ look_name: lookName, tiers: { good, better, best } });
      }
      return;
    }

    if (Array.isArray(look?.selected_ids)) {
      const fallbackTier = normalizeLookTier({
        selected_ids: look.selected_ids,
        total_price: look.total_price,
        description: look.description,
      });
      if (fallbackTier) {
        tiered.push({
          look_name: lookName,
          tiers: { good: fallbackTier, better: fallbackTier, best: fallbackTier },
        });
      }
    }
  });

  return tiered;
}

function normalizeLookTier(raw: any) {
  const ids = Array.isArray(raw?.selected_ids)
    ? raw.selected_ids.filter((id: unknown) => typeof id === "string" && id.trim().length > 0)
    : [];
  const totalPrice = Number(raw?.total_price) || 0;
  const description = typeof raw?.description === "string" ? raw.description : "";

  return { selected_ids: ids, total_price: totalPrice, description };
}

function buildTierReasoning(looks: TieredLook[], followUpQuestion: string): Record<TierName, string> {
  const reasoning = createEmptyTierReasoning();
  (Object.keys(reasoning) as TierName[]).forEach((tier) => {
    if (!looks.length) return;
    const parts = looks.map((look) => {
      const tierData = look.tiers[tier];
      const total = Number(tierData.total_price) || 0;
      const totalLabel = total > 0 ? ` (Total: ${total} TL)` : "";
      const description = tierData.description || "";
      if (!description && !totalLabel) return null;
      return `**${look.look_name}**: ${description}${totalLabel}`.trim();
    }).filter(Boolean);

    let text = parts.join("\n\n");
    if (!text) text = FALLBACK_REASONING;
    if (followUpQuestion) text += `\n\n_${followUpQuestion}_`;
    reasoning[tier] = text;
  });

  return reasoning;
}

function buildTierProducts(
  looks: TieredLook[],
  filtered: any[],
  matches: any[],
  fallbackDescription: string,
): Record<TierName, AgentResponse["products"]> {
  const tierProducts = createEmptyTierProducts();

  (Object.keys(tierProducts) as TierName[]).forEach((tier) => {
    tierProducts[tier] = buildProductsForTier(looks, tier, filtered, matches, fallbackDescription);
  });

  return tierProducts;
}

function buildProductsForTier(
  looks: TieredLook[],
  tier: TierName,
  filtered: any[],
  matches: any[],
  fallbackDescription: string,
): AgentResponse["products"] {
  const products: AgentResponse["products"] = [];

  if (looks.length > 0) {
    looks.forEach((look) => {
      const tierData = look.tiers[tier];
      const selected = Array.isArray(tierData?.selected_ids) ? tierData.selected_ids : [];
      selected.forEach((id: string) => {
        const item = filtered.find((m) => m.id === id) || matches.find((m) => m.id === id);
        if (item && !products.some((p) => p.id === item.id)) {
          const remoteImages = getRemoteProductImages(item.product_url, item.image_url);
          const localImages = getLocalProductImages(item.product_url);
          const images = remoteImages.images.length > 0 ? remoteImages.images : localImages.images;
          const primaryImage = remoteImages.primary || localImages.primary || "";
          products.push({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            category: item.category,
            product_url: item.product_url,
            image_url: primaryImage,
            images,
            badges: buildBadges(item.attributes ?? {}),
            similarity: item.similarity,
            look_name: look.look_name,
            look_description: tierData?.description || "",
          });
        }
      });
    });
  }

  const remaining = filtered
    .filter((item) => !products.some((p) => p.id === item.id))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  remaining.forEach((item) => {
    const remoteImages = getRemoteProductImages(item.product_url, item.image_url);
    const localImages = getLocalProductImages(item.product_url);
    const images = remoteImages.images.length > 0 ? remoteImages.images : localImages.images;
    const primaryImage = remoteImages.primary || localImages.primary || "";
    products.push({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      category: item.category,
      product_url: item.product_url,
      image_url: primaryImage,
      images,
      badges: buildBadges(item.attributes ?? {}),
      similarity: item.similarity,
      look_name: "More Results",
      look_description: "Additional matching items from your search",
    });
  });

  if (products.length === 0) {
    return filtered.slice(0, 20).map((item) => {
      const remoteImages = getRemoteProductImages(item.product_url, item.image_url);
      const localImages = getLocalProductImages(item.product_url);
      const images = remoteImages.images.length > 0 ? remoteImages.images : localImages.images;
      const primaryImage = remoteImages.primary || localImages.primary || "";
      return {
        id: item.id,
        name: item.name,
        price: Number(item.price),
        category: item.category,
        product_url: item.product_url,
        image_url: primaryImage,
        images,
        badges: buildBadges(item.attributes ?? {}),
        similarity: item.similarity,
        look_name: "Suggested Items",
        look_description: fallbackDescription || "Found some great items for you.",
      };
    });
  }

  return products;
}

function buildBadges(attributes: Record<string, unknown>): string[] {
  const badges: string[] = [];
  const tempRange = typeof attributes.temp_range === "string" ? attributes.temp_range : "";
  const formality = typeof attributes.formality === "string" ? attributes.formality : "";
  const style = typeof attributes.style === "string" ? attributes.style : "";

  if (tempRange) badges.push(capitalize(tempRange));
  if (formality) badges.push(capitalize(formality.replace("_", " ")));
  if (style) badges.push(capitalize(style));

  return badges.slice(0, 3);
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
