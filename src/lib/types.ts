export interface AgentRequest {
  query: string;
  history?: ConversationMessage[];
  image?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResponse {
  products: Product[];
  reasoning: string;
  tool_calls_log: ToolCallLog[];
  payment_plan: PaymentPlan | null;
  track: "A" | "B";
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  product_url: string;
  image_url: string;
  badges: string[];
  similarity: number;
}

export interface ToolCallLog {
  tool: string;
  status: "running" | "done" | "failed";
  summary: string;
}

export interface PaymentPlan {
  type: "pay_now" | "bnpl_3" | "installment_6" | "split";
  total: number;
  monthly?: number;
  label: string;
  savings_tip?: string;
}
