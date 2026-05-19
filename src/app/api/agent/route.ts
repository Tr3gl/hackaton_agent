import { NextResponse } from "next/server";
import { geminiEmbed, extractSearchIntent, curateProducts } from "@/lib/gemini";
import { matchProducts } from "@/lib/supabase";
import { executeTool } from "@/lib/tools";
import { getLocalProductImages, getRemoteProductImages } from "@/lib/server/product-images";
import {
  formatCurationSummary,
  formatIntentSummary,
  formatPaymentSummary,
  formatSearchSummary,
  formatWeatherSummary,
  formatNumber,
  getStrings,
  normalizeLanguage,
} from "@/lib/i18n";
import type {
  AgentRequest,
  AgentResponse,
  ToolCallLog,
  PaymentPlan,
  WeatherData,
  TierName,
  TieredLook,
  Language,
} from "@/lib/types";

export async function POST(request: Request) {
  let payload: AgentRequest | null = null;

  try {
    payload = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = payload?.query?.trim();
  const history = payload?.history || [];
  const language = normalizeLanguage(payload?.language);
  const strings = getStrings(language);
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const fallbackReasoning = strings.fallbackReasoning;
  let reasoning: string = fallbackReasoning;
  let products: AgentResponse["products"] = [];
  const tool_calls_log: ToolCallLog[] = [];
  let payment_plan: PaymentPlan | null = null;
  let weather: WeatherData | null = null;
  let tieredLooks: TieredLook[] = [];
  let tierProducts = createEmptyTierProducts();
  let tierReasoning = createEmptyTierReasoning(fallbackReasoning);
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
      reasoning: strings.directMatchReasoning,
    };
  } else {
    // Phase 1: Structured Intent Extraction
    intent = await extractSearchIntent(query, history, language);
    tool_calls_log.push({ 
      tool: "extract_intent", 
      status: "done", 
      summary: formatIntentSummary(
        language,
        intent.semantic_queries,
        intent.filters as Record<string, unknown>,
        intent.budget,
      ),
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
        summary: formatWeatherSummary(
          language,
          weather.location,
          weather.temp_c,
          weather.condition,
          weather.wind_speed,
        ),
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

    tool_calls_log.push({
      tool: "search_catalog",
      status: "done",
      summary: formatSearchSummary(
        language,
        matches.length,
        validEmbeddings.length,
        Object.keys(supabaseFilter).length,
      ),
    });
    
    // Client-side attribute filtering for fields the Supabase RPC doesn't handle
    const filtered = matches;

    // Phase 3: LLM Curation (Stylist Selection) — pass intent for budget/garment enforcement
    const curationResult = await curateProducts(query, filtered, intent, history, language);
    const rawLooks = Array.isArray(curationResult?.looks) ? curationResult.looks : [];
    followUpQuestion = typeof curationResult?.follow_up_question === "string" ? curationResult.follow_up_question : "";
    tieredLooks = normalizeLooks(rawLooks);
    tool_calls_log.push({
      tool: "curate_products",
      status: "done",
      summary: formatCurationSummary(language, tieredLooks.length),
    });

    tierProducts = buildTierProducts(tieredLooks, filtered, matches, intent.reasoning || "", {
      suggestedItems: strings.suggestedItems,
      moreResults: strings.moreResults,
      moreResultsDescription: strings.moreResultsDescription,
      suggestedDescription: strings.suggestedDescription,
    });
    tierReasoning = buildTierReasoning(
      tieredLooks,
      followUpQuestion,
      fallbackReasoning,
      strings.totalLabel,
      language,
    );

    activeTier = normalizeTierName((curationResult as any)?.active_tier) || "better";
    products = tierProducts[activeTier];
    reasoning = tierReasoning[activeTier] || fallbackReasoning;

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
        summary: formatPaymentSummary(language, paymentResult.scheme),
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

function createEmptyTierReasoning(fallbackReasoning: string): Record<TierName, string> {
  return { good: fallbackReasoning, better: fallbackReasoning, best: fallbackReasoning };
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

function buildTierReasoning(
  looks: TieredLook[],
  followUpQuestion: string,
  fallbackReasoning: string,
  totalLabel: string,
  language: Language,
): Record<TierName, string> {
  const reasoning = createEmptyTierReasoning(fallbackReasoning);
  (Object.keys(reasoning) as TierName[]).forEach((tier) => {
    if (!looks.length) return;
    const parts = looks.map((look) => {
      const tierData = look.tiers[tier];
      const total = Number(tierData.total_price) || 0;
      const totalLabelText = total > 0 ? ` (${totalLabel}: ${formatNumber(total, language)} TL)` : "";
      const description = tierData.description || "";
      if (!description && !totalLabelText) return null;
      return `**${look.look_name}**: ${description}${totalLabelText}`.trim();
    }).filter(Boolean);

    let text = parts.join("\n\n");
    if (!text) text = fallbackReasoning;
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
  lookLabels: {
    suggestedItems: string;
    moreResults: string;
    moreResultsDescription: string;
    suggestedDescription: string;
  },
): Record<TierName, AgentResponse["products"]> {
  const tierProducts = createEmptyTierProducts();

  (Object.keys(tierProducts) as TierName[]).forEach((tier) => {
    tierProducts[tier] = buildProductsForTier(
      looks,
      tier,
      filtered,
      matches,
      fallbackDescription,
      lookLabels,
    );
  });

  return tierProducts;
}

function buildProductsForTier(
  looks: TieredLook[],
  tier: TierName,
  filtered: any[],
  matches: any[],
  fallbackDescription: string,
  lookLabels: {
    suggestedItems: string;
    moreResults: string;
    moreResultsDescription: string;
    suggestedDescription: string;
  },
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
      look_name: lookLabels.moreResults,
      look_description: lookLabels.moreResultsDescription,
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
        look_name: lookLabels.suggestedItems,
        look_description: fallbackDescription || lookLabels.suggestedDescription,
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
