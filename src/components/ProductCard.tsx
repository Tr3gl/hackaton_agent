import React from "react";
import Link from "next/link";
import { CheckCircle2, PlusCircle } from "lucide-react";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
}

export function ProductCard({ product, isSelected = false, onToggle }: ProductCardProps) {
  const primaryImage = product.images?.[0] || product.image_url;
  const content = (
    <article className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all hover:shadow-lg group cursor-pointer ${isSelected ? 'border-sage-500 shadow-md ring-1 ring-sage-500' : 'border-sand-200 hover:border-sage-400/50'}`}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-sand-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-500">No image</div>
        )}
        
        {onToggle && (
          <button
            onClick={(e) => {
              e.preventDefault(); // Prevent navigating to PDP
              onToggle(product.id);
            }}
            className="absolute top-3 right-3 z-10 rounded-full bg-white/90 backdrop-blur-sm p-1 text-ink-900 shadow-sm transition-transform hover:scale-110"
          >
            {isSelected ? (
              <CheckCircle2 className="w-6 h-6 text-sage-600 fill-sage-100" />
            ) : (
              <PlusCircle className="w-6 h-6 text-ink-400 hover:text-ink-900" />
            )}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-ink-900 line-clamp-1" title={product.name}>
          {product.name}
        </div>
        <div className="flex justify-between items-center">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-700">
            {product.category}
          </div>
          <div className="text-sm font-medium text-ink-900">{product.price} TL</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-auto">
        {product.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-sand-200 bg-sand-50 px-2 py-1 text-xs text-ink-700"
          >
            {badge}
          </span>
        ))}
      </div>
    </article>
  );

  if (product.id) {
    return (
      <Link href={`/product/${product.id}`} className="no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
