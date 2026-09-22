import { ProductCardSkeleton, ProductGrid, Skeleton } from "@/components/luxury";

/**
 * Mirrors the real listing's structure — header block, filter rule, then an
 * 8-tile grid at the same 3:4 ratio — so the page doesn't jump when the data
 * arrives and replaces this.
 */
export default function ProductsLoading() {
  return (
    <div className="page-enter">
      <header className="mb-10 flex flex-col justify-between gap-5 border-b border-soft-300/60 pb-8 sm:flex-row sm:items-end">
        <div className="space-y-4">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-2.5 w-16" />
      </header>

      <div className="flex gap-5 border-b border-soft-300/60 pb-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-2.5 w-20" />
        ))}
      </div>

      <ProductGrid columns={4} className="mt-8">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
          <ProductCardSkeleton key={item} />
        ))}
      </ProductGrid>
    </div>
  );
}
