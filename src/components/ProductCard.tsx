import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice } from "@/types/product";

export default function ProductCard({ product }: { product: Product }) {
  const anyInStock = product.variants.some((v) => v.inStock && v.quantity > 0);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="product-stage aspect-[3/4] transition-colors duration-500 group-hover:border-soft-500">
        <Image
          src={product.frontImageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-4 transition-opacity duration-500 ease-apple group-hover:opacity-0 sm:p-7"
        />
        <Image
          src={product.backImageUrl}
          alt={`${product.name} back view`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="absolute inset-0 object-contain p-4 opacity-0 transition-opacity duration-500 ease-apple group-hover:opacity-100 sm:p-7"
        />
        {!anyInStock && (
          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-soft-700">
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
