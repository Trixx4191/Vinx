import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice } from "@/types/product";

export default function ProductCard({ product }: { product: Product }) {
  const anyInStock = product.variants.some((v) => v.inStock && v.quantity > 0);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <Image
          src={product.frontImageUrl}
          alt={product.name}
          fill
          className="object-cover transition-opacity duration-200 group-hover:opacity-0"
        />
        <Image
          src={product.backImageUrl}
          alt={`${product.name} back view`}
          fill
          className="absolute inset-0 object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
        {!anyInStock && (
          <span className="absolute left-2 top-2 bg-black px-2 py-1 text-xs text-white">Out of stock</span>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span>{product.name}</span>
        <span>{formatPrice(product.price, product.currency)}</span>
      </div>
    </Link>
  );
}
