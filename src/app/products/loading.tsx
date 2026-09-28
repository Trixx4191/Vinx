import { ProductCardSkeleton, ProductGrid, Skeleton } from "@/components/luxury";

/** Mirrors the catalog — a centred row of words, then the grid — so nothing jumps when it loads. */
export default function ProductsLoading() {
  return (
    <div>
      <div className="flex justify-center gap-6 py-6 sm:py-8">
        {[0, 1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-3 w-14" />
        ))}
      </div>
      <ProductGrid className="mt-2 sm:mt-6">
        {Array.from({ length: 12 }, (_, item) => (
          <ProductCardSkeleton key={item} />
        ))}
      </ProductGrid>
    </div>
  );
}
