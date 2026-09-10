import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice } from "@/types/product";

export default function ProductCard({ product }: { product: Product }) {
  const anyInStock = product.variants.some((v) => v.inStock && v.quantity > 0);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-soft-100 shadow-card transition-all duration-500 ease-apple-out group-hover:shadow-soft-lg group-hover:-translate-y-1">
        <Image
          src={product.frontImageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-opacity duration-500 ease-apple group-hover:opacity-0"
        />
        <Image
          src={product.backImageUrl}
          alt={`${product.name} back view`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="absolute inset-0 object-cover opacity-0 transition-opacity duration-500 ease-apple group-hover:opacity-100"
        />
        {!anyInStock && (
          <span className="absolute left-3 top-3 rounded-full bg-soft-700/90 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2 px-0.5">
        <span className="truncate text-sm font-medium text-soft-700 transition-colors duration-300 group-hover:text-soft-900">
          {product.name}
        </span>
        <span className="shrink-0 text-sm text-soft-500">
          {formatPrice(product.price, product.currency)}
        </span>
      </div>
    </Link>
  );
}
