import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Placeholders are requested as .png on purpose. placehold.co serves SVG by
// default, and next/image refuses SVG unless `dangerouslyAllowSVG` is set —
// which would be the wrong trade here, since remotePatterns currently allows
// any https host, so an SVG from an arbitrary origin could carry script
// through the image optimizer. A raster placeholder sidesteps that entirely.
const placeholder = (label: string, tone = "e8e8e8") =>
  `https://placehold.co/600x800.png/${tone}/333333?text=${encodeURIComponent(label)}`;

// A stable, publicly hosted sample clip, here only so the hover-video path can
// be seen working before real product footage exists. Replace with your own
// asset — this is demo data, not something to ship.
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

type SeedProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  description: string;
  material: string;
  price: number;
  hoverVideoUrl?: string;
  galleryImages?: string[];
  variants: Array<{ size: string; color: string; sku: string; quantity: number }>;
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "vinx-classic-tee",
    name: "Vinx Classic Tee",
    categorySlug: "t-shirts",
    description: "A placeholder product to verify the catalog renders end to end.",
    material: "100% cotton",
    price: 12000,
    // Carries video + gallery so the Phase 2 media path is exercised by the
    // seed rather than only being reachable once someone uploads real assets.
    hoverVideoUrl: SAMPLE_VIDEO,
    galleryImages: [placeholder("Detail 1", "f3f3f3"), placeholder("Detail 2", "d3d3d3")],
    variants: [
      { size: "S", color: "Black", sku: "VNX-TEE-S-BLK", quantity: 10 },
      { size: "M", color: "Black", sku: "VNX-TEE-M-BLK", quantity: 8 },
      { size: "L", color: "White", sku: "VNX-TEE-L-WHT", quantity: 0 }
    ]
  },
  {
    slug: "vinx-heavy-hoodie",
    name: "Vinx Heavy Hoodie",
    categorySlug: "hoodies",
    description: "Brushed inside, structured outside. Sits close without pulling.",
    material: "380gsm brushed cotton",
    price: 38000,
    variants: [
      { size: "M", color: "Stone", sku: "VNX-HOD-M-STN", quantity: 6 },
      { size: "L", color: "Stone", sku: "VNX-HOD-L-STN", quantity: 4 },
      { size: "L", color: "Black", sku: "VNX-HOD-L-BLK", quantity: 3 }
    ]
  },
  {
    slug: "vinx-field-jacket",
    name: "Vinx Field Jacket",
    categorySlug: "jackets",
    description: "A light shell for the in-between months, cut to layer over a hoodie.",
    material: "Waxed cotton canvas",
    price: 74000,
    galleryImages: [placeholder("Lining", "f3f3f3")],
    variants: [
      { size: "M", color: "Olive", sku: "VNX-JKT-M-OLV", quantity: 2 },
      { size: "L", color: "Olive", sku: "VNX-JKT-L-OLV", quantity: 0 }
    ]
  },
  {
    slug: "vinx-wide-trouser",
    name: "Vinx Wide Trouser",
    categorySlug: "pants",
    description: "A relaxed leg that holds its line through the day.",
    material: "Cotton twill",
    price: 29000,
    variants: [
      { size: "30", color: "Sand", sku: "VNX-TRS-30-SND", quantity: 5 },
      { size: "32", color: "Sand", sku: "VNX-TRS-32-SND", quantity: 7 },
      { size: "34", color: "Charcoal", sku: "VNX-TRS-34-CHR", quantity: 4 }
    ]
  },
  {
    slug: "vinx-knit-cap",
    name: "Vinx Knit Cap",
    categorySlug: "accessories",
    description: "Fine-gauge merino, folded once.",
    material: "Merino wool",
    price: 9000,
    variants: [
      { size: "One size", color: "Black", sku: "VNX-CAP-OS-BLK", quantity: 12 },
      { size: "One size", color: "Cream", sku: "VNX-CAP-OS-CRM", quantity: 9 }
    ]
  }
];

async function main() {
  const categories = ["T-Shirts", "Hoodies", "Jackets", "Pants", "Accessories"];

  for (const name of categories) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  for (const entry of PRODUCTS) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: entry.categorySlug } });

    const media = {
      frontImageUrl: placeholder(`${entry.name} front`),
      backImageUrl: placeholder(`${entry.name} back`),
      hoverVideoUrl: entry.hoverVideoUrl ?? null,
      galleryImages: entry.galleryImages ?? []
    };

    await prisma.product.upsert({
      where: { slug: entry.slug },
      // The media fields are refreshed on every run rather than left alone.
      // The previous seed used `update: {}`, so a database seeded before this
      // change would keep its old SVG placeholder URLs forever and keep
      // failing to render, even after running the corrected seed.
      update: media,
      create: {
        name: entry.name,
        slug: entry.slug,
        description: entry.description,
        material: entry.material,
        price: entry.price,
        currency: "GHS",
        categoryId: category.id,
        ...media,
        variants: {
          create: entry.variants.map((variant) => ({ ...variant, inStock: variant.quantity > 0 }))
        }
      }
    });
  }

  console.log(`Seeded ${PRODUCTS.length} products across ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
