"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  name: string;
  imageUnavailable: string;
  previousLabel: string;
  nextLabel: string;
  thumbnailLabel: string;
}

export function ProductGallery({
  images,
  name,
  imageUnavailable,
  previousLabel,
  nextLabel,
  thumbnailLabel,
}: ProductGalleryProps) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [safeImages.length, safeImages[0]]);

  const currentImage = safeImages[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % safeImages.length);
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-sand-200">
        {currentImage ? (
          <img
            src={currentImage}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            {imageUnavailable}
          </div>
        )}

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={previousLabel}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-ink-900 shadow-sm backdrop-blur hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={nextLabel}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-ink-900 shadow-sm backdrop-blur hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-lg border ${
                index === activeIndex ? "border-ink-900" : "border-sand-200"
              }`}
            >
              <img
                src={image}
                alt={`${name} ${thumbnailLabel} ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
