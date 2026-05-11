"use client";

import { useState } from "react";
import type { AgentResponse } from "@/lib/types";

const placeholderQueries = [
  "windy walk in Istanbul",
  "summer trip to Bodrum",
  "casual office look",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = async (nextQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery }),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Request failed");
      }

      const data = (await res.json()) as AgentResponse;
      setResponse(data);
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
    void runQuery(trimmed);
  };

  return (
    <div className="flex flex-1 flex-col">
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-20 pt-10">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-[0_24px_60px_-48px_rgba(31,26,23,0.6)] backdrop-blur"
        >
          <label className="text-sm font-medium uppercase tracking-[0.25em] text-ink-700">
            Describe what you need
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: something warm for a windy evening"
              className="min-w-[220px] flex-1 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-base text-ink-900 shadow-sm focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-sage-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-sage-400 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700"
            >
              {loading ? "Searching" : "Ask Agent"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-ink-700">
            {placeholderQueries.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setQuery(item);
                  void runQuery(item);
                }}
                className="rounded-full border border-sand-200 bg-white px-3 py-1 transition hover:border-sage-400 hover:text-sage-600"
              >
                {item}
              </button>
            ))}
          </div>
        </form>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-6 rounded-3xl border border-sand-200 bg-white/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-display text-2xl text-ink-900">Results</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-ink-700">
                Track {response?.track ?? "A"}
              </span>
            </div>

            {error && (
              <div className="rounded-2xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-500">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-sand-200 bg-sand-50 px-4 py-4 text-sm text-ink-700">
              {response?.reasoning ??
                "Run a query to see the agent reasoning appear here."}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(response?.products ?? []).map((product) => (
                <article
                  key={product.id}
                  className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-white p-4"
                >
                  <div className="text-sm font-semibold text-ink-900">
                    {product.name}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-700">
                    {product.category}
                  </div>
                  <div className="text-sm text-ink-900">{product.price} TL</div>
                  <div className="flex flex-wrap gap-2 text-xs text-ink-700">
                    {product.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-sand-200 px-2 py-1"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {(response?.products ?? []).length === 0 && !error && (
              <div className="rounded-2xl border border-dashed border-sand-200 px-4 py-6 text-sm text-ink-700">
                No products yet. The next step is wiring Supabase search.
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4 rounded-3xl border border-sand-200 bg-white/80 p-6">
            <h2 className="text-display text-2xl text-ink-900">Agent Thinking</h2>
            <div className="flex flex-col gap-3 text-sm text-ink-700">
              {(response?.tool_calls_log ?? []).length === 0 && (
                <span>Tool calls will appear here once the agent loop is live.</span>
              )}
              {(response?.tool_calls_log ?? []).map((log, index) => (
                <div
                  key={`${log.tool}-${index}`}
                  className="rounded-2xl border border-sand-200 bg-sand-50 px-3 py-3"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-ink-700">
                    {log.tool}
                  </div>
                  <div className="text-sm text-ink-900">{log.summary}</div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
