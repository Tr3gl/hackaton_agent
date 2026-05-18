export const tools = [
  {
    name: "extract_intent",
    description: "Extract structured intent from a natural language query. Use this first for any query.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name if mentioned" },
        occasion: { type: "string", description: "Event type: wedding, vacation, work, casual, etc." },
        weather_context_needed: { type: "boolean", description: "True if query mentions weather, location, or outdoor activity" },
        budget_max: { type: "number", description: "Maximum budget in TL if mentioned" },
        category_hint: { type: "string", description: "Product category if obvious from query" }
      }
    }
  },
  {
    name: "get_weather",
    description: "Get current weather for a city. Only call if weather_context_needed is true.",
    parameters: {
      type: "object",
      required: ["location"],
      properties: {
        location: { type: "string" }
      }
    }
  },
  {
    name: "search_catalog",
    description: "Search the product catalog using semantic search with optional filters.",
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Natural language search query" },
        filters: {
          type: "object",
          properties: {
            temp_range: { type: "string", enum: ["cold", "cool", "mild", "warm", "hot"] },
            wind_resistance: { type: "boolean" },
            waterproof: { type: "boolean" },
            formality: { type: "string", enum: ["casual", "smart_casual", "formal"] },
            max_price: { type: "number" },
            category: { type: "string" }
          }
        }
      }
    }
  },
  {
    name: "get_bundle_price",
    description: "Calculate total price for a set of products and check for bundle discount.",
    parameters: {
      type: "object",
      required: ["product_ids"],
      properties: {
        product_ids: { type: "array", items: { type: "string" } }
      }
    }
  },
  {
    name: "suggest_payment_plan",
    description: "Suggest the best payment scheme based on total amount and purchase type.",
    parameters: {
      type: "object",
      required: ["total", "purchase_type"],
      properties: {
        total: { type: "number", description: "Total cart value in TL" },
        purchase_type: { type: "string", enum: ["impulse", "planned", "life_event"] }
      }
    }
  }
];

export async function executeTool(name: string, args: Record<string, unknown>): Promise<any> {
  switch (name) {
    case "extract_intent":
      return { location: args.location || "Istanbul", weather_context_needed: args.weather_context_needed || false };
    case "get_weather": {
      const location = args.location as string;
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return { temp_c: 14, condition: "windy", wind_speed: 32, note: "using mock data (missing API key)" };
      }
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error("Weather API failed");
        const data = await res.json();
        return {
          temp_c: Math.round(data.main.temp),
          condition: data.weather[0]?.main || "unknown",
          wind_speed: Math.round(data.wind.speed * 3.6), // convert m/s to km/h
          location: data.name
        };
      } catch (err) {
        return { temp_c: 14, condition: "windy", wind_speed: 32, note: "fallback due to error/timeout" };
      }
    }
    case "search_catalog":
      return { applied_filters: args.filters, status: "ready for search pipeline" };
    case "get_bundle_price": {
      const ids = (args.product_ids as string[]) || [];
      const count = ids.length || 3;
      const basePrice = count * 750; // Mock average price 750 TL
      let discount = 0;
      if (count >= 3) discount = Math.round(basePrice * 0.15); // 15% off for 3+ items
      return { total: basePrice - discount, original_total: basePrice, discount, items_count: count };
    }
    case "suggest_payment_plan": {
      const total = Number(args.total) || 1500;
      const type = (args.purchase_type as string) || "impulse";
      
      if (type === "life_event") {
        return { 
          scheme: "bnpl_3", 
          monthly: total / 3, 
          label: `3 × ${(total/3).toFixed(0)} TL`, 
          savings_tip: "Split into 3 to avoid interest." 
        };
      }
      if (type === "planned" || total > 5000) {
        return { 
          scheme: "installment_6", 
          monthly: total / 6, 
          label: `6 × ${(total/6).toFixed(0)} TL`, 
          savings_tip: "Spread the cost over 6 months." 
        };
      }
      
      return { 
        scheme: "pay_now", 
        total, 
        label: "Pay now", 
        savings_tip: "No extra fees." 
      };
    }
    default:
      return { error: `Tool ${name} not implemented` };
  }
}

export function summarizeTool(name: string, result: any): string {
  switch (name) {
    case "extract_intent":
      return `Intent extracted: ${JSON.stringify(result)}`;
    case "get_weather":
      return `Weather: ${result.temp_c}°C, ${result.condition}`;
    case "search_catalog":
      return "Searched catalog for matches";
    case "get_bundle_price":
      return `Bundle calculated: ${result.total} TL`;
    case "suggest_payment_plan":
      return `Suggested payment plan: ${result.scheme}`;
    default:
      return "Tool executed";
  }
}
