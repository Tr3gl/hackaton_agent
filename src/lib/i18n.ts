import type { Language } from "@/lib/types";

export const DEFAULT_LANGUAGE: Language = "en";

const STRINGS = {
  en: {
    locale: "en-US",
    languageLabel: "Language",
    languageEnglish: "English",
    languageTurkish: "Turkish",
    heroKicker: "AI Shopping Agent",
    heroTitle: "Fashion search that understands context.",
    heroSubtitle:
      "Ask for outfits by mood, weather, or occasion. The agent will call tools, summarize its reasoning, and return the most relevant items.",
    modeBadge: "Gemini flash mode",
    searchLabel: "Describe what you need",
    searchPlaceholder: "Try: something warm for a windy evening",
    searchButton: "Ask Agent",
    searchingButton: "Searching…",
    voiceStartTitle: "Voice input",
    voiceStopTitle: "Stop listening",
    alertSpeechNotSupported: "Speech recognition is not supported in your browser. Try Chrome or Edge.",
    placeholderQueries: [
      "warm outfit for windy walk in Istanbul",
      "casual office look under 5000 TL",
      "summer vacation in Bodrum",
    ],
    youLabel: "You",
    agentLabel: "Agent",
    resultsTitle: "Results",
    tierLabel: "Tier",
    tierNames: { good: "good", better: "better", best: "best" },
    trackLabel: "Track",
    reasoningFallback: "Run a query to see the agent's reasoning appear here.",
    fallbackReasoning: "Here are some items you might like based on your search.",
    totalLabel: "Total",
    noProducts: "No products yet. Try describing what you are looking for.",
    suggestedItems: "Suggested Items",
    moreResults: "More Results",
    moreResultsDescription: "Additional matching items from your search",
    suggestedDescription: "Found some great items for you.",
    agentThinkingTitle: "Agent Thinking",
    agentThinkingEmpty: "Tool calls will appear here once the agent loop is live.",
    bundleTotal: "Bundle Total",
    addSelected: "Add Selected to Cart",
    addedToCart: "Added to Cart ✓",
    imageUnavailable: "Image unavailable",
    previousImage: "Previous image",
    nextImage: "Next image",
    thumbnailLabel: "thumbnail",
    noImage: "No image",
    backToAgent: "Back to Agent",
    productDetails: "Product Details",
    addToCart: "Add to Cart",
    buyWithPlan: "Buy with Payment Plan",
    freeShipping: "Free shipping on all orders over 1000 TL. Easy 30-day returns.",
    apparelFallback: "Apparel",
    paymentTips: {
      pay_now: "No extra fees.",
      bnpl_3: "Split into 3 to avoid interest.",
      installment_6: "Spread the cost over 6 months.",
      split: "Split into two to manage the cost.",
    },
    payNowLabel: "Pay now",
    toolLabels: {
      extract_intent: "extract intent",
      get_weather: "get weather",
      search_catalog: "search catalog",
      curate_products: "curate products",
      suggest_payment_plan: "suggest payment plan",
    },
    intentFallbackReasoning: "Using original query as fallback",
    directMatchReasoning: "Direct matching for your search.",
    fallbackLookName: "Fallback Set",
    fallbackFollowUp: "Would you like a different style direction?",
    fallbackTierDescription: "Found some great items for you.",
  },
  tr: {
    locale: "tr-TR",
    languageLabel: "Dil",
    languageEnglish: "İngilizce",
    languageTurkish: "Türkçe",
    heroKicker: "Yapay Zeka Alışveriş Asistanı",
    heroTitle: "Bağlamı anlayan moda araması.",
    heroSubtitle:
      "Ruh haline, havaya veya etkinliğe göre kombinler iste. Asistan araçları çalıştırır, mantığını özetler ve en uygun ürünleri getirir.",
    modeBadge: "Gemini flash modu",
    searchLabel: "Ne aradığını anlat",
    searchPlaceholder: "Örn: rüzgarlı bir akşam için sıcak bir şey",
    searchButton: "Asistana Sor",
    searchingButton: "Aranıyor…",
    voiceStartTitle: "Sesli giriş",
    voiceStopTitle: "Dinlemeyi durdur",
    alertSpeechNotSupported: "Tarayıcınızda sesli giriş desteklenmiyor. Chrome veya Edge deneyin.",
    placeholderQueries: [
      "İstanbul'da rüzgarlı yürüyüş için sıcak kombin",
      "5000 TL altı rahat ofis kombini",
      "Bodrum için yaz tatili kombini",
    ],
    youLabel: "Sen",
    agentLabel: "Asistan",
    resultsTitle: "Sonuçlar",
    tierLabel: "Seviye",
    tierNames: { good: "iyi", better: "daha iyi", best: "en iyi" },
    trackLabel: "İz",
    reasoningFallback: "Sorgu çalıştırınca asistanın açıklaması burada görünecek.",
    fallbackReasoning: "Aramana göre sevebileceğin bazı ürünler burada.",
    totalLabel: "Toplam",
    noProducts: "Henüz ürün yok. Aradığını biraz daha tarif etmeyi dene.",
    suggestedItems: "Önerilen Ürünler",
    moreResults: "Daha Fazla Sonuç",
    moreResultsDescription: "Aramanla eşleşen ek ürünler",
    suggestedDescription: "Senin için güzel ürünler buldum.",
    agentThinkingTitle: "Asistanın Düşüncesi",
    agentThinkingEmpty: "Araç çağrıları, asistan döngüsü çalıştığında burada görünecek.",
    bundleTotal: "Seçilenler Toplamı",
    addSelected: "Seçilenleri Sepete Ekle",
    addedToCart: "Sepete Eklendi ✓",
    imageUnavailable: "Görsel yok",
    previousImage: "Önceki görsel",
    nextImage: "Sonraki görsel",
    thumbnailLabel: "küçük görsel",
    noImage: "Görsel yok",
    backToAgent: "Asistana Dön",
    productDetails: "Ürün Detayları",
    addToCart: "Sepete Ekle",
    buyWithPlan: "Taksitle Satın Al",
    freeShipping: "1000 TL üzeri siparişlerde kargo ücretsiz. 30 gün kolay iade.",
    apparelFallback: "Giyim",
    paymentTips: {
      pay_now: "Ek ücret yok.",
      bnpl_3: "3 taksitte faizsiz böl.",
      installment_6: "6 aya yayarak öde.",
      split: "İki taksite böl.",
    },
    payNowLabel: "Peşin öde",
    toolLabels: {
      extract_intent: "niyet çıkarımı",
      get_weather: "hava durumu",
      search_catalog: "katalog arama",
      curate_products: "ürün kürasyonu",
      suggest_payment_plan: "ödeme planı",
    },
    intentFallbackReasoning: "Orijinal sorgu ile devam ediliyor",
    directMatchReasoning: "Araman için doğrudan eşleştirme yapılıyor.",
    fallbackLookName: "Yedek Kombin",
    fallbackFollowUp: "Farklı bir stil yönü ister misin?",
    fallbackTierDescription: "Senin için güzel ürünler buldum.",
  },
} as const;

export type UiStrings = (typeof STRINGS)[Language];

export function normalizeLanguage(value?: string | null): Language {
  if (!value) return DEFAULT_LANGUAGE;
  const lower = value.toLowerCase();
  if (lower.startsWith("tr")) return "tr";
  return "en";
}

export function getStrings(language: Language): UiStrings {
  return STRINGS[language];
}

export function getLocale(language: Language): string {
  return STRINGS[language].locale;
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(getLocale(language)).format(value);
}

export function formatPaymentPlanLabel(
  language: Language,
  type: "pay_now" | "bnpl_3" | "installment_6" | "split",
  total: number,
  monthly?: number,
): string {
  if (type === "bnpl_3" && monthly) return `3 × ${formatNumber(monthly, language)} TL`;
  if (type === "installment_6" && monthly) return `6 × ${formatNumber(monthly, language)} TL`;
  if (type === "split" && monthly) return `2 × ${formatNumber(monthly, language)} TL`;
  if (type === "pay_now") return STRINGS[language].payNowLabel;
  return `${formatNumber(total, language)} TL`;
}

export function formatPaymentPlanTip(
  language: Language,
  type: "pay_now" | "bnpl_3" | "installment_6" | "split",
): string {
  return STRINGS[language].paymentTips[type];
}

export function formatToolName(language: Language, tool: string): string {
  const mapped = STRINGS[language].toolLabels[tool as keyof typeof STRINGS.en.toolLabels];
  return mapped || tool.replace(/_/g, " ");
}

export function formatIntentSummary(
  language: Language,
  semanticQueries: string[],
  filters: Record<string, unknown>,
  budget: { min: number | null; max: number | null },
): string {
  const queries = semanticQueries.join(" | ");
  const min = budget.min ?? "∞";
  const max = budget.max ?? "∞";
  if (language === "tr") {
    return `Niyet: "${queries}" | Filtreler: ${JSON.stringify(filters)} | Bütçe: ${min}–${max} TL`;
  }
  return `Intent: "${queries}" | Filters: ${JSON.stringify(filters)} | Budget: ${min}–${max} TL`;
}

export function formatWeatherSummary(
  language: Language,
  location: string,
  tempC: number,
  condition: string,
  wind: number,
): string {
  if (language === "tr") {
    return `${location}: ${tempC}°C, ${condition}, rüzgar ${wind} km/sa`;
  }
  return `${location}: ${tempC}°C, ${condition}, wind ${wind} km/h`;
}

export function formatSearchSummary(
  language: Language,
  matches: number,
  queryCount: number,
  filterCount: number,
): string {
  if (language === "tr") {
    return `${queryCount} anlamsal sorguda ${matches} benzersiz ürün bulundu (DB filtresi: ${filterCount})`;
  }
  return `Found ${matches} unique products across ${queryCount} semantic queries (with ${filterCount} DB filters)`;
}

export function formatCurationSummary(language: Language, lookCount: number): string {
  if (language === "tr") {
    return `${lookCount} kombin oluşturuldu.`;
  }
  return `Built ${lookCount} coordinated looks.`;
}

export function formatPaymentSummary(language: Language, scheme: string): string {
  if (language === "tr") {
    return `Ödeme planı önerildi: ${scheme}`;
  }
  return `Suggested payment plan: ${scheme}`;
}
