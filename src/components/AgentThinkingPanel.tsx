import React from "react";
import type { ToolCallLog } from "@/lib/types";

interface AgentThinkingPanelProps {
  logs: ToolCallLog[];
}

export function AgentThinkingPanel({ logs }: AgentThinkingPanelProps) {
  return (
    <aside className="flex flex-col gap-4 rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-sm">
      <h2 className="text-display text-2xl text-ink-900">Agent Thinking</h2>
      <div className="flex flex-col gap-3 text-sm text-ink-700">
        {logs.length === 0 && (
          <span className="italic text-ink-500">Tool calls will appear here once the agent loop is live.</span>
        )}
        {logs.map((log, index) => (
          <div
            key={`${log.tool}-${index}`}
            className="flex flex-col gap-1 rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-ink-700">
                {log.tool.replace(/_/g, " ")}
              </div>
              <div>
                {log.status === "running" && <span className="animate-pulse text-sage-500">⚙️</span>}
                {log.status === "done" && <span className="text-sage-600">✓</span>}
                {log.status === "failed" && <span className="text-clay-500">✗</span>}
              </div>
            </div>
            <div className="text-sm text-ink-900 mt-1">{log.summary}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
