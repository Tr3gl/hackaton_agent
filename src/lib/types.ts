export interface AgentRequest {
  query: string;
  history?: ConversationMessage[];
  image?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface WeatherData {
  temp_c: number;
  condition: string;
  wind_speed: number;
  location: string;
}

export type TierName = "good" | "better" | "best";

export interface LookTier {
  selected_ids: string[];
  total_price: number;
  description: string;
}

export interface TieredLook {
  look_name: string;
  tiers: Record<TierName, LookTier>;
}

export type TieredProducts = Record<TierName, Product[]>;

export type TierReasoning = Record<TierName, string>;

export interface AgentResponse {
  products: Product[];
  reasoning: string;
  tool_calls_log: ToolCallLog[];
  payment_plan: PaymentPlan | null;
  weather: WeatherData | null;
  track: "A" | "B";
  tier_products?: TieredProducts;
  tier_reasoning?: TierReasoning;
  looks?: TieredLook[];
  active_tier?: TierName;
  follow_up_question?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  product_url: string;
  image_url: string;
  images?: string[];
  badges: string[];
  similarity: number;
  look_name?: string;
  look_description?: string;
}

export interface ToolCallLog {
  tool: string;
  status: "running" | "done" | "failed";
  summary: string;
  result?: any;
}

export interface PaymentPlan {
  type: "pay_now" | "bnpl_3" | "installment_6" | "split";
  total: number;
  monthly?: number;
  label: string;
  savings_tip?: string;
}
