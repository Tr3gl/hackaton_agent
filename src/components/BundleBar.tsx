"use client";
import React, { useState } from "react";
import type { PaymentPlan } from "@/lib/types";

interface BundleBarProps {
  itemCount: number;
  totalPrice: number;
  paymentPlan: PaymentPlan | null;
}

export function BundleBar({ itemCount, totalPrice, paymentPlan }: BundleBarProps) {
  const [added, setAdded] = useState(false);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-sand-200 bg-white/90 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-100 font-medium text-ink-900">
            {itemCount}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ink-900">Bundle Total</span>
            <span className="text-lg font-bold text-sage-600">{totalPrice.toLocaleString()} TL</span>
          </div>
        </div>

        {paymentPlan && (
          <div className="flex items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 px-4 py-2">
            <span className="text-xl">💳</span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                {paymentPlan.label}
              </span>
              {paymentPlan.savings_tip && (
                <span className="text-xs text-ink-500">{paymentPlan.savings_tip}</span>
              )}
            </div>
          </div>
        )}

        <button 
          onClick={() => setAdded(true)}
          className={`rounded-2xl px-8 py-3 text-sm font-semibold text-white transition shadow-md ${added ? 'bg-sage-600 hover:bg-sage-500' : 'bg-ink-900 hover:bg-ink-700'}`}
        >
          {added ? "Added to Cart ✓" : "Add Selected to Cart"}
        </button>
      </div>
    </div>
  );
}
