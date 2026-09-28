import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { releaseState, canView, canBuy } from "@/lib/release";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, isPublished: true },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        select: { id: true, size: true, color: true, colorHex: true, quantity: true, inStock: true, sku: true }
      },
      // On-model photography, if this product has any. Only the detail page
      // loads these — a grid tile shows the flat product shot, so selecting
      // model imagery for every card would be work nothing renders.
      modelShots: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          imageUrl: true,
          sortOrder: true,
          model: { select: { name: true, heightCm: true, wearingSize: true } }
        }
      }
    }
  });

  if (!product) notFound();

  const session = await getServerSession(authOptions);
  const viewer = { isVip: Boolean(session?.user?.vip), isAdmin: isAdminRole(session?.user?.role) };
  const state = releaseState(product);

  // An unopened drop is a 404 to anyone but an admin — the same response as a
  // product that does not exist, so the page does not confirm it is coming.
  if (!canView(state, viewer)) notFound();

  return (
    <ProductDetailClient
      product={product}
      access={{
        state,
        purchasable: canBuy(state, viewer),
        releaseAt: product.releaseAt?.toISOString() ?? null,
        signedIn: Boolean(session?.user?.id)
      }}
    />
  );
}
