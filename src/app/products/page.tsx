import type { CatalogParams } from "@/lib/productQuery";
import Catalog from "./Catalog";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  return <Catalog params={await searchParams} />;
}
