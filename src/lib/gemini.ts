import type { ConversationMessage } from "./types";

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768;

export async function geminiText(prompt: string): Promise<string> {
  if (process.env.USE_LOCAL_MODEL === "true") {
    const url = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8000/v1";
    const response = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });
    if (!response.ok) throw new Error(`Local LLM error: ${response.status}`);
    const data = await response.json();
    let text = data.choices?.[0]?.message?.content?.trim() ?? "";
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return text;
  }

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

  let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return text;
}

export interface SearchIntentFilters {
  product_type?: string;
  item_subtype?: string[];
  gender?: string;
  temp_range?: string;
  formality?: string;
  occasion?: string[];
  activity?: string[];
  style?: string;
  aesthetic_vibe?: string[];
  fit?: string;
  season?: string[];
  material_feel?: string;
  tactile_feel?: string;
  outfit_role?: string;
  color_family?: string;
  pattern?: string;
  care_level?: string;
  wrinkle_resistant?: boolean;
  size_range?: string;
}

export interface SearchIntent {
  semantic_queries: string[];
  filters: SearchIntentFilters;
  budget: { min: number | null; max: number | null };
  garment_types: string[];
  location: string | null;
  reasoning: string;
}

const PRODUCT_TYPE = ["clothing", "footwear", "outerwear", "bag", "accessory", "other"] as const;
const ITEM_SUBTYPE = [
  "jeans",
  "trousers",
  "shirt",
  "tshirt",
  "dress",
  "skirt",
  "jacket",
  "coat",
  "sweater",
  "hoodie",
  "shorts",
  "shoes",
  "sneakers",
  "boots",
  "sandals",
  "bag",
  "belt",
  "hat",
  "scarf",
  "wallet",
  "other",
] as const;
const GENDER = ["women", "men", "unisex"] as const;
const TEMP_RANGE = ["cold", "cool", "mild", "warm", "hot"] as const;
const FORMALITY = ["casual", "smart_casual", "formal", "beach", "black_tie"] as const;
const OCCASION = ["everyday", "outdoor", "work", "party", "wedding", "vacation", "sport"] as const;
const ACTIVITY = ["walking", "office", "travel", "beach", "evening", "casual"] as const;
const STYLE = ["classic", "trendy", "streetwear", "bohemian", "minimalist"] as const;
const AESTHETIC_VIBE = ["old_money", "gorpcore", "y2k", "office_siren", "grunge"] as const;
const FIT = ["slim", "regular", "oversized", "relaxed"] as const;
const SEASON = ["spring", "summer", "autumn", "winter"] as const;
const MATERIAL_FEEL = ["lightweight", "medium", "heavy"] as const;
const TACTILE_FEEL = ["soft", "crisp", "structured", "flowing"] as const;
const OUTFIT_ROLE = ["statement", "core_basic", "accent", "layering_base"] as const;
const COLOR_FAMILY = ["neutral", "earth", "bright", "dark", "pastel"] as const;
const PATTERN = ["solid", "striped", "check", "print", "graphic", "textured"] as const;
const CARE_LEVEL = ["easy_care", "standard", "dry_clean_only"] as const;
const SIZE_RANGE = ["xs_xl", "one_size", "numeric", "unknown"] as const;

const INTENT_EXTRACTION_PROMPT = `You are a fashion product search intent extractor.

CRITICAL RULE: The user may write in ANY language (Russian, Turkish, English, Arabic, etc.).
You MUST first understand the meaning of their query, then output ALL fields in ENGLISH.
The "semantic_queries" field MUST ALWAYS contain English queries.

Your catalog has these product attributes (use ONLY these exact values):

product_type: clothing | footwear | outerwear | bag | accessory | other
item_subtype: jeans | trousers | shirt | tshirt | dress | skirt | jacket | coat | sweater | hoodie | shorts | shoes | sneakers | boots | sandals | bag | belt | hat | scarf | wallet | other
gender: women | men | unisex
temp_range: cold | cool | mild | warm | hot
formality: casual | smart_casual | formal | beach | black_tie
occasion: everyday | outdoor | work | party | wedding | vacation | sport
activity: walking | office | travel | beach | evening | casual
style: classic | trendy | streetwear | bohemian | minimalist
aesthetic_vibe: old_money | gorpcore | y2k | office_siren | grunge
fit: slim | regular | oversized | relaxed
season: spring | summer | autumn | winter
material_feel: lightweight | medium | heavy
tactile_feel: soft | crisp | structured | flowing
outfit_role: statement | core_basic | accent | layering_base
color_family: neutral | earth | bright | dark | pastel
pattern: solid | striped | check | print | graphic | textured
care_level: easy_care | standard | dry_clean_only
wrinkle_resistant: true | false
size_range: xs_xl | one_size | numeric | unknown

=== INTERPRETATION RULES ===
1. FIRST: Translate the user's query to English in your head.
2. Map clothing words to item_subtype: dress/платье/elbise→"dress", skirt/юбка/etek→"skirt", jeans/джинсы/kot→"jeans", jacket/куртка/ceket→"jacket", shirt/рубашка/gömlek→"shirt", trousers/брюки/pantolon→"trousers", coat/пальто/palto→"coat", sweater/свитер/kazak→"sweater", shorts/шорты/şort→"shorts", hoodie/худи/kapüşonlu→"hoodie", tshirt/футболка/tişört→"tshirt", shoes/обувь/ayakkabı→"shoes", boots/сапоги/bot→"boots", sneakers/кроссовки/spor ayakkabı→"sneakers".
3. Map events to occasion and formality: wedding/свадьба/düğün→"wedding"+"formal", work/работа/iş→"work"+"smart_casual", party/вечеринка/parti→"party", vacation/отпуск/tatil→"vacation".
4. Map weather/location to temp_range.
5. Map fabric mentions to material_feel and tactile_feel if explicit.
6. Extract budget in TL if mentioned.
7. Build semantic_queries as DESCRIPTIVE ENGLISH PHRASES. If the user asks for multiple completely different occasions/looks (e.g., "morning meeting and rave party"), generate a separate query for EACH. If it's just one occasion, output an array with 1 query.
8. Only include filter fields with clear signal. Omit uncertain fields.

=== EXAMPLES ===

User: "Найди все платья в каталоге"
Answer: {"semantic_queries":["all dresses in the catalog, women dress collection"],"filters":{"item_subtype":["dress"],"product_type":"clothing","gender":"women"},"budget":{"min":null,"max":null},"location":null,"reasoning":"User asked for all dresses (платья) in catalog"}

User: "Свадьба в Москве, ветреный день, лёгкая ткань, юбка или платье, бюджет 9-10к TL"
Answer: {"semantic_queries":["formal elegant wedding outfit with lightweight dress or skirt for cool weather"],"filters":{"item_subtype":["dress","skirt"],"formality":"formal","occasion":["wedding"],"temp_range":"cool","material_feel":"lightweight"},"budget":{"min":9000,"max":10000},"location":"Moscow","reasoning":"Wedding in Moscow, windy day, light fabric, wants skirt or dress, budget 9-10k TL"}

User: "casual office look"
Answer: {"semantic_queries":["casual smart office everyday work outfit comfortable"],"filters":{"formality":"smart_casual","occasion":["work"],"activity":["office"]},"budget":{"min":null,"max":null},"location":null,"reasoning":"User wants a casual work/office outfit"}

User: "yazlık elbise Bodrum tatili için"
Answer: {"semantic_queries":["summer dress for beach vacation hot weather lightweight breathable"],"filters":{"item_subtype":["dress"],"temp_range":"hot","occasion":["vacation"],"season":["summer"],"material_feel":"lightweight"},"budget":{"min":null,"max":null},"location":"Bodrum","reasoning":"Summer dress for Bodrum vacation, hot weather expected"}

User: "Make 2 looks, one for morning meeting in berlin, one for party rave"
Answer: {"semantic_queries":["sharp professional morning business meeting outfit formal","sleek dark edgy rave party outfit comfortable for dancing"],"filters":{},"budget":{"min":null,"max":null},"location":"Berlin","reasoning":"User wants two distinct looks: a professional meeting and an edgy rave party."}

=== OUTPUT FORMAT (valid JSON only, no markdown, no explanation) ===
{"semantic_queries":["..."],"filters":{...},"budget":{"min":null_or_number,"max":null_or_number},"location":"city_or_null","reasoning":"..."}`;

function coerceEnum(value: unknown, allowed: readonly string[]): string | undefined {
  if (typeof value !== "string") return undefined;
  return allowed.includes(value) ? value : undefined;
}

function coerceEnumArray(value: unknown, allowed: readonly string[]): string[] | undefined {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = list.map((item) => (typeof item === "string" ? item : "")).filter(Boolean);
  const deduped = Array.from(new Set(normalized.filter((item) => allowed.includes(item))));
  return deduped.length > 0 ? deduped : undefined;
}

function normalizeFilters(raw: any): SearchIntentFilters {
  const filters: SearchIntentFilters = {};

  const productType = coerceEnum(raw?.product_type, PRODUCT_TYPE);
  if (productType) filters.product_type = productType;

  const itemSubtype = coerceEnumArray(raw?.item_subtype, ITEM_SUBTYPE);
  if (itemSubtype) filters.item_subtype = itemSubtype;

  const gender = coerceEnum(raw?.gender, GENDER);
  if (gender) filters.gender = gender;

  const tempRange = coerceEnum(raw?.temp_range, TEMP_RANGE);
  if (tempRange) filters.temp_range = tempRange;

  const formality = coerceEnum(raw?.formality, FORMALITY);
  if (formality) filters.formality = formality;

  const occasion = coerceEnumArray(raw?.occasion, OCCASION);
  if (occasion) filters.occasion = occasion;

  const activity = coerceEnumArray(raw?.activity, ACTIVITY);
  if (activity) filters.activity = activity;

  const style = coerceEnum(raw?.style, STYLE);
  if (style) filters.style = style;

  const aestheticVibe = coerceEnumArray(raw?.aesthetic_vibe, AESTHETIC_VIBE);
  if (aestheticVibe) filters.aesthetic_vibe = aestheticVibe;

  const fit = coerceEnum(raw?.fit, FIT);
  if (fit) filters.fit = fit;

  const season = coerceEnumArray(raw?.season, SEASON);
  if (season) filters.season = season;

  const materialFeel = coerceEnum(raw?.material_feel, MATERIAL_FEEL);
  if (materialFeel) filters.material_feel = materialFeel;

  const tactileFeel = coerceEnum(raw?.tactile_feel, TACTILE_FEEL);
  if (tactileFeel) filters.tactile_feel = tactileFeel;

  const outfitRole = coerceEnum(raw?.outfit_role, OUTFIT_ROLE);
  if (outfitRole) filters.outfit_role = outfitRole;

  const colorFamily = coerceEnum(raw?.color_family, COLOR_FAMILY);
  if (colorFamily) filters.color_family = colorFamily;

  const pattern = coerceEnum(raw?.pattern, PATTERN);
  if (pattern) filters.pattern = pattern;

  const careLevel = coerceEnum(raw?.care_level, CARE_LEVEL);
  if (careLevel) filters.care_level = careLevel;

  if (typeof raw?.wrinkle_resistant === "boolean") {
    filters.wrinkle_resistant = raw.wrinkle_resistant;
  }

  const sizeRange = coerceEnum(raw?.size_range, SIZE_RANGE);
  if (sizeRange) filters.size_range = sizeRange;

  return filters;
}

// Intent extraction ALWAYS uses Gemini API — local models are too small for reliable JSON extraction
const DEFAULT_INTENT_MODEL = "gemini-3.1-flash-lite";

export async function extractSearchIntent(query: string, history: ConversationMessage[] = []): Promise<SearchIntent> {
  const historyText = history.length > 0 ? history.map(h => `${h.role === 'user' ? 'User' : 'Agent'}: ${h.content}`).join("\n") : "None";
  const prompt = `${INTENT_EXTRACTION_PROMPT}\n\nRecent conversation:\n${historyText}\n\nUser current query: "${query}"`;
  
  const defaultIntent: SearchIntent = {
    semantic_queries: [query],
    filters: {},
    budget: { min: null, max: null },
    garment_types: [],
    location: null,
    reasoning: "Using original query as fallback",
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    
    const model = process.env.GEMINI_INTENT_MODEL || DEFAULT_INTENT_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.1, 
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              semantic_queries: { type: "ARRAY", items: { type: "STRING" } },
              filters: {
                type: "OBJECT",
                properties: {
                  product_type: { type: "STRING" },
                  item_subtype: { type: "ARRAY", items: { type: "STRING" } },
                  gender: { type: "STRING" },
                  temp_range: { type: "STRING" },
                  formality: { type: "STRING" },
                  occasion: { type: "ARRAY", items: { type: "STRING" } },
                  activity: { type: "ARRAY", items: { type: "STRING" } },
                  style: { type: "STRING" },
                  aesthetic_vibe: { type: "ARRAY", items: { type: "STRING" } },
                  fit: { type: "STRING" },
                  season: { type: "ARRAY", items: { type: "STRING" } },
                  material_feel: { type: "STRING" },
                  tactile_feel: { type: "STRING" },
                  outfit_role: { type: "STRING" },
                  color_family: { type: "STRING" },
                  pattern: { type: "STRING" },
                  care_level: { type: "STRING" },
                  wrinkle_resistant: { type: "BOOLEAN" },
                  size_range: { type: "STRING" }
                }
              },
              budget: {
                type: "OBJECT",
                properties: {
                  min: { type: "NUMBER", nullable: true },
                  max: { type: "NUMBER", nullable: true }
                }
              },
              location: { type: "STRING", nullable: true },
              reasoning: { type: "STRING" }
            },
            required: ["semantic_queries", "filters", "budget", "reasoning"]
          }
        },
      }),
    });
    
    if (!response.ok) throw new Error(`Gemini intent error: ${response.status}`);
    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    // Strip <think> tags (handles both closed and unclosed variants)
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    text = text.replace(/<think>[\s\S]*/g, "").trim();
    
    const parsed = JSON.parse(text);

    const toNumberOrNull = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.]/g, "");
        const parsedNumber = Number(cleaned);
        return Number.isFinite(parsedNumber) ? parsedNumber : null;
      }
      return null;
    };

    const normalizedFilters = normalizeFilters(parsed.filters || {});

    // Extract garment_types from filters.item_subtype
    const garmentTypes = Array.isArray(normalizedFilters.item_subtype)
      ? normalizedFilters.item_subtype
      : [];

    // Handle backward compatibility if the model returns semantic_query instead of semantic_queries
    const queries = Array.isArray(parsed.semantic_queries) 
      ? parsed.semantic_queries 
      : (parsed.semantic_query ? [parsed.semantic_query] : [query]);

    return {
      semantic_queries: queries,
      filters: normalizedFilters,
      budget: {
        min: toNumberOrNull(parsed.budget?.min),
        max: toNumberOrNull(parsed.budget?.max),
      },
      garment_types: garmentTypes,
      location: parsed.location || null,
      reasoning: parsed.reasoning || "",
    };
  } catch (error) {
    console.error("Intent extraction failed:", error);
    return defaultIntent;
  }
}

export async function curateProducts(query: string, products: any[], intent?: SearchIntent, history: ConversationMessage[] = []): Promise<any> {
  // Format products with richer attribute context for the stylist
  const productContext = products.map(p => {
    const attrs = p.attributes || {};
    const subtypePart = attrs.item_subtype ? ` | Type: ${attrs.item_subtype}` : '';
    const stylePart = attrs.style ? ` | Style: ${attrs.style}` : '';
    const occasionPart = Array.isArray(attrs.occasion) ? ` | Occasion: ${attrs.occasion.join(', ')}` : '';
    const materialPart = attrs.material_feel ? ` | Material: ${attrs.material_feel}` : '';
    const windPart = attrs.wind_resistance ? ' | Windproof' : '';
    return `ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Price: ${p.price} TL | Formality: ${attrs.formality || 'unknown'} | Temp: ${attrs.temp_range || 'unknown'}${subtypePart}${stylePart}${occasionPart}${materialPart}${windPart}`;
  }).join("\n");

  // Build budget constraint section
  let budgetSection = "";
  if (intent?.budget?.min || intent?.budget?.max) {
    const minStr = intent.budget.min ? `${intent.budget.min} TL` : "no minimum";
    const maxStr = intent.budget.max ? `${intent.budget.max} TL` : "no maximum";
    budgetSection = `\n\nSTRICT BUDGET CONSTRAINT: The user requires total price per look between ${minStr} and ${maxStr}. You MUST mathematically verify that the sum of selected item prices falls within this range. This is non-negotiable.`;
  }

  // Build garment preference section
  let garmentSection = "";
  if (intent?.garment_types && intent.garment_types.length > 0) {
    garmentSection = `\n\nGARMENT PREFERENCE: The user specifically wants: ${intent.garment_types.join(", ")}. Each look MUST include at least one of these garment types.`;
  }

  // Build intent context section
  let intentSection = "";
  if (intent?.reasoning) {
    intentSection = `\n\nINTERPRETED INTENT: ${intent.reasoning}`;
  }

  const historyText = history.length > 0 ? history.map(h => `${h.role === 'user' ? 'User' : 'Agent'}: ${h.content}`).join("\n") : "None";
  const prompt = `You are a professional fashion stylist.
Recent conversation:
${historyText}

The user gave this current request: "${query}"
${intentSection}
Here are the top items from our catalog that match the semantic intent:
${productContext}
${budgetSection}${garmentSection}

YOUR TASK:
1. Act as a creative stylist. Group the items into 1 to 3 distinct "looks" (e.g., "Look 1: Lightweight Skirt Setup").
2. For EACH look, you MUST produce 3 tiers: good, better, best.
   - good: value tier (lower prices, basics, minimal extras)
   - better: mid-range tier (balanced quality and styling)
   - best: premium tier (statement pieces, higher quality)
3. For each tier, you MUST form a COMPLETE outfit. A complete outfit MUST have a Top AND a Bottom, OR a Dress. You may add outerwear or accessories.
4. NEVER select the same ID twice within a tier. Avoid reusing the same ID across tiers when possible.
5. If there is a budget constraint above, mathematically ensure the sum of the prices of your selected items for EACH tier is STRICTLY within that range. Add up the prices and verify.
6. If the user mentions a future date or long-term stay, use your broad internal knowledge of the typical climate for that destination and season, rather than relying strictly on the current weather.
7. Provide a stylish description for each tier.
8. Generate an engaging follow-up question to refine the user's needs or suggest alternatives (e.g. 'Would you prefer more casual shoes with this?' or 'How long is your vacation?').

You MUST respond in pure JSON format exactly matching this structure, with no markdown code blocks around it:
{
  "looks": [
    {
      "look_name": "Look 1: Lightweight Skirt Setup",
      "tiers": {
        "good": {
          "selected_ids": ["uuid-1", "uuid-2"],
          "total_price": 3159,
          "description": "A breathable, minimal setup for everyday movement."
        },
        "better": {
          "selected_ids": ["uuid-3", "uuid-4"],
          "total_price": 4159,
          "description": "Perfect for a windy Moscow day, this elegant skirt pairs beautifully with the lightweight shirt."
        },
        "best": {
          "selected_ids": ["uuid-5", "uuid-6"],
          "total_price": 6159,
          "description": "A premium take with refined textures and a statement layer."
        }
      }
    }
  ],
  "follow_up_question": "Would you like me to find some comfortable walking shoes to go with these looks?"
}`;

  try {
    let text = "{}";
    if (process.env.USE_LOCAL_MODEL === "true") {
      const url = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8000/v1";
      const response = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        }),
      });
      if (!response.ok) throw new Error(`Local LLM curation error: ${response.status}`);
      const data = await response.json();
      text = data.choices?.[0]?.message?.content?.trim() || "{}";
    } else {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
      const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      
      const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.2, 
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                looks: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      look_name: { type: "STRING" },
                      tiers: {
                        type: "OBJECT",
                        properties: {
                          good: {
                            type: "OBJECT",
                            properties: {
                              selected_ids: { type: "ARRAY", items: { type: "STRING" } },
                              total_price: { type: "NUMBER" },
                              description: { type: "STRING" }
                            },
                            required: ["selected_ids", "total_price", "description"]
                          },
                          better: {
                            type: "OBJECT",
                            properties: {
                              selected_ids: { type: "ARRAY", items: { type: "STRING" } },
                              total_price: { type: "NUMBER" },
                              description: { type: "STRING" }
                            },
                            required: ["selected_ids", "total_price", "description"]
                          },
                          best: {
                            type: "OBJECT",
                            properties: {
                              selected_ids: { type: "ARRAY", items: { type: "STRING" } },
                              total_price: { type: "NUMBER" },
                              description: { type: "STRING" }
                            },
                            required: ["selected_ids", "total_price", "description"]
                          }
                        },
                        required: ["good", "better", "best"]
                      }
                    },
                    required: ["look_name", "tiers"]
                  }
                },
                follow_up_question: { type: "STRING" }
              },
              required: ["looks", "follow_up_question"]
            }
          },
        }),
      });

      if (!response.ok) throw new Error(`Gemini curation error: ${response.status}`);
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    }
    
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    const fallbackIds = products.slice(0, 5).map(p => p.id);
    return {
      looks: [
        {
          look_name: "Fallback Set",
          tiers: {
            good: { selected_ids: fallbackIds, total_price: 0, description: "Found some great items for you." },
            better: { selected_ids: fallbackIds, total_price: 0, description: "Found some great items for you." },
            best: { selected_ids: fallbackIds, total_price: 0, description: "Found some great items for you." }
          }
        }
      ],
      follow_up_question: "Would you like a different style direction?"
    };
  }
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
