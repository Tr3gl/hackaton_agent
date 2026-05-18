import { notFound } from "next/navigation";
import { getProductById } from "@/lib/supabase";
import { getLocalProductImages, getRemoteProductImages } from "@/lib/server/product-images";
import { ProductGallery } from "@/components/ProductGallery";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

type ProductPageParams = { id?: string } | Promise<{ id?: string }>;

export default async function ProductPage({ params }: { params: ProductPageParams }) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id?.trim();

  if (!id) {
    notFound();
  }

  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const remoteImages = getRemoteProductImages(product.product_url, product.image_url);
  const localImages = getLocalProductImages(product.product_url);
  const galleryImages = remoteImages.images.length > 0
    ? remoteImages.images
    : localImages.images;

  // Parse attributes for display
  const attrs = product.attributes || {};
  // Format attributes into a list of labels
  const details = Object.entries(attrs)
    .filter(([_, v]) => v !== null && v !== "" && (Array.isArray(v) ? v.length > 0 : true))
    .map(([k, v]) => ({
      key: k.replace(/_/g, " "),
      value: Array.isArray(v) ? v.join(", ") : String(v),
    }));

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900 font-sans selection:bg-sage-200">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-sand-200/50 bg-sand-50/80 px-6 py-4 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 text-ink-600 hover:text-ink-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Back to Agent</span>
        </Link>
        <div className="font-serif text-2xl font-medium tracking-tight text-ink-900">
          CNTXT<span className="text-sage-600">.</span>
        </div>
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-2 items-start">
          
          {/* Image Gallery Section */}
          <ProductGallery images={galleryImages} name={product.name} />

          {/* Product Details Section */}
          <div className="flex flex-col gap-8 lg:sticky lg:top-32">
            
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full bg-sage-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sage-800">
                {product.category || "Apparel"}
              </div>
              <h1 className="font-serif text-4xl lg:text-5xl font-medium leading-tight text-ink-900">
                {product.name}
              </h1>
              <div className="text-3xl font-light tracking-tight text-ink-700">
                {product.price} TL
              </div>
            </div>

            <div className="h-px w-full bg-sand-200" />

            <div className="space-y-6">
              <h3 className="font-medium text-ink-900 uppercase tracking-widest text-xs">Product Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <dt className="text-xs font-bold uppercase tracking-widest text-ink-400">
                      {detail.key}
                    </dt>
                    <dd className="text-sm font-medium text-ink-800 capitalize">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="h-px w-full bg-sand-200" />

            <div className="flex flex-col gap-4 pt-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-4 text-sm font-medium text-sand-50 transition-all hover:bg-ink-800 hover:shadow-lg active:scale-[0.98]">
                <ShoppingBag className="w-5 h-5" />
                Add to Cart
              </button>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-transparent px-6 py-4 text-sm font-medium text-ink-900 transition-all hover:bg-sand-100 active:scale-[0.98]">
                Buy with Payment Plan
              </button>
            </div>

            <p className="text-xs text-center text-ink-400 pt-2">
              Free shipping on all orders over 1000 TL. Easy 30-day returns.
            </p>

          </div>
        </div>
      </main>
    </div>
  );
}
