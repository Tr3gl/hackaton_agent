"use client";

import { useState, useEffect, useRef } from "react";
import type { AgentResponse, ConversationMessage, TierName } from "@/lib/types";
import { SearchBar } from "@/components/SearchBar";
import { ProductGrid } from "@/components/ProductGrid";
import { AgentThinkingPanel } from "@/components/AgentThinkingPanel";
import { ReasoningBanner } from "@/components/ReasoningBanner";
import { BundleBar } from "@/components/BundleBar";
import { WeatherWidget } from "@/components/WeatherWidget";

export default function Home() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTier, setActiveTier] = useState<TierName>("better");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const runQuery = async (nextQuery: string) => {
    setLoading(true);
    setError(null);
    
    // Add user message to UI immediately
    const userMsg: ConversationMessage = { role: "user", content: nextQuery };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery, history: messages }),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Request failed");
      }

      const data = (await res.json()) as AgentResponse;
      setResponse(data);
      // Reset selection when new response comes in
      setSelectedIds(new Set());
      if (data.reasoning) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reasoning }]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setQuery("");
    void runQuery(trimmed);
  };

  const handlePlaceholderClick = (val: string) => {
    setQuery("");
    void runQuery(val);
  };

  useEffect(() => {
    if (response?.active_tier) {
      setActiveTier(response.active_tier);
    } else if (response?.tier_products) {
      setActiveTier("better");
    }
  }, [response]);

  const tierProducts = response?.tier_products;
  const tierReasoning = response?.tier_reasoning;
  const products = tierProducts?.[activeTier] ?? response?.products ?? [];
  const reasoningText = tierReasoning?.[activeTier] ?? response?.reasoning;
  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  const totalPrice = selectedProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const baseTierTotal = products.reduce((sum, p) => sum + Number(p.price || 0), 0);

  // Recalculate payment plan dynamically based on selected items
  let dynamicPaymentPlan = response?.payment_plan || null;
  const planTotal = selectedProducts.length > 0 ? totalPrice : baseTierTotal;
  if (dynamicPaymentPlan && planTotal > 0) {
    const originalType = dynamicPaymentPlan.type;
    let monthly = undefined;
    let label = `${planTotal.toLocaleString()} TL`;

    if (originalType === "bnpl_3") {
      monthly = Math.round(planTotal / 3);
      label = `3 × ${monthly.toLocaleString()} TL`;
    } else if (originalType === "installment_6") {
      monthly = Math.round(planTotal / 6);
      label = `6 × ${monthly.toLocaleString()} TL`;
    } else if (originalType === "split") {
      monthly = Math.round(planTotal / 2);
      label = `2 × ${monthly.toLocaleString()} TL`;
    }

    dynamicPaymentPlan = {
      ...dynamicPaymentPlan,
      total: planTotal,
      monthly,
      label,
    };
  }

  const handleToggleProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTierChange = (tier: TierName) => {
    setActiveTier(tier);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-1 flex-col relative pb-24">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.35em] text-ink-700">
              AI Shopping Agent
            </span>
            <h1 className="text-display text-4xl font-semibold text-ink-900 sm:text-5xl">
              Fashion search that understands context.
            </h1>
          </div>
          <div className="rounded-full bg-sand-100 px-4 py-2 text-sm text-ink-700">
            Gemini flash mode
          </div>
        </div>
        <p className="max-w-2xl text-base text-ink-700 sm:text-lg">
          Ask for outfits by mood, weather, or occasion. The agent will call
          tools, summarize its reasoning, and return the most relevant items.
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-10 pt-10">
        
        <div className="flex flex-col gap-6">
          {messages.length > 0 && (
            <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 pb-4">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-3xl max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-sand-100 text-ink-900 self-end rounded-br-sm' 
                      : 'bg-sage-50 text-ink-900 self-start rounded-bl-sm border border-sage-100'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${
                    msg.role === 'user' ? 'text-ink-400' : 'text-sage-600'
                  }`}>
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </span>
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          <SearchBar 
            query={query}
            setQuery={setQuery}
            onSubmit={handleSubmit}
            loading={loading}
            onPlaceholderClick={handlePlaceholderClick}
          />
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-display text-2xl text-ink-900">Results</h2>
              <div className="flex items-center gap-3">
                {response?.tier_products && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
                      Tier
                    </span>
                    <div className="flex items-center rounded-full border border-sand-200 bg-white p-1">
                      {(["good", "better", "best"] as TierName[]).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => handleTierChange(tier)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                            activeTier === tier
                              ? "bg-ink-900 text-sand-50"
                              : "text-ink-600 hover:text-ink-900"
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sage-600 bg-sage-50 px-3 py-1 rounded-full">
                  Track {response?.track ?? "A"}
                </span>
              </div>
            </div>

            <ReasoningBanner reasoning={reasoningText} />

            <ProductGrid 
              products={products} 
              error={error} 
              loading={loading}
              selectedIds={selectedIds}
              onToggle={handleToggleProduct}
            />
          </div>

          <div className="sticky top-6 flex flex-col gap-4">
            {response?.weather && (
              <WeatherWidget weather={response.weather} />
            )}
            <AgentThinkingPanel logs={response?.tool_calls_log ?? []} />
          </div>
        </section>
      </main>

      <BundleBar 
        itemCount={selectedProducts.length}
        totalPrice={totalPrice}
        paymentPlan={dynamicPaymentPlan}
      />
    </div>
  );
}
