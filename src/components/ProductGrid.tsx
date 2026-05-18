import React from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  error?: string | null;
  loading?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
}

export function ProductGrid({ products, error, loading, selectedIds, onToggle }: ProductGridProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-clay-500/30 bg-clay-500/10 px-4 py-3 text-sm text-clay-500">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-sand-100" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-200 px-4 py-12 text-center text-sm text-ink-700">
        No products yet. Try describing what you are looking for.
      </div>
    );
  }

  // Group products by look_name
  const groupedProducts = products.reduce((acc, product) => {
    const lookName = product.look_name || "Suggested Items";
    if (!acc[lookName]) {
      acc[lookName] = [];
    }
    acc[lookName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-12">
      {Object.entries(groupedProducts).map(([lookName, lookProducts]) => (
        <div key={lookName} className="space-y-4">
          <div className="border-b border-sand-200 pb-2">
            <h3 className="text-xl font-bold text-ink-900 flex items-center gap-2">
              <span className="text-2xl">✨</span> {lookName}
            </h3>
            {lookProducts[0]?.look_description && (
              <p className="mt-1 text-sm text-ink-600">{lookProducts[0].look_description}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {lookProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                isSelected={selectedIds?.has(product.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
