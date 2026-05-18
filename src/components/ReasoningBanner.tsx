import React from "react";

interface ReasoningBannerProps {
  reasoning?: string;
}

export function ReasoningBanner({ reasoning }: ReasoningBannerProps) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-sand-50 px-5 py-4 text-sm text-ink-800 shadow-sm flex items-start gap-3">
      <span className="text-xl shrink-0">✨</span>
      <p className="leading-relaxed font-medium whitespace-pre-wrap">
        {reasoning || "Run a query to see the agent's reasoning appear here."}
      </p>
    </div>
  );
}
