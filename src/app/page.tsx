import type { CatalogParams } from "@/lib/productQuery";
import Catalog from "./products/Catalog";
import Hero from "@/components/Hero";
import { readSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

/**
 * The homepage: the hero image, then the catalog.
 *
 * The hero is set from /admin/homepage. With none set, the page opens straight
 * on the grid — there is no placeholder image, because a stand-in photograph
 * on a live storefront reads as the real thing.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const [params, settings] = await Promise.all([searchParams, readSettings()]);
  const hero = settings.heroImageUrl;

  return (
    <>
      {hero && (
        <>
          <h1 className="sr-only">Vinx</h1>
          <Hero src={hero} />
        </>
      )}

      {/* The hero links here. `scroll-mt` keeps the category row from sliding
          under the sticky header when the page scrolls to it. */}
      <div id="shop" className="scroll-mt-14">
        <Catalog params={params} headingLevel={hero ? "h2" : "h1"} />
      </div>
    </>
  );
}
