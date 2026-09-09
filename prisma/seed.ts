import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = ["T-Shirts", "Hoodies", "Jackets", "Pants", "Accessories"];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: { name, slug: name.toLowerCase().replace(/\s+/g, "-") }
    });
  }

  const tshirts = await prisma.category.findUniqueOrThrow({ where: { slug: "t-shirts" } });

  const product = await prisma.product.upsert({
    where: { slug: "vinx-classic-tee" },
    update: {},
    create: {
      name: "Vinx Classic Tee",
      slug: "vinx-classic-tee",
      description: "A placeholder product to verify the catalog renders end to end.",
      material: "100% cotton",
      price: 12000, // GHS 120.00
      currency: "GHS",
      categoryId: tshirts.id,
      frontImageUrl: "https://placehold.co/600x800?text=Front",
      backImageUrl: "https://placehold.co/600x800?text=Back",
      variants: {
        create: [
          { size: "S", color: "Black", sku: "VNX-TEE-S-BLK", quantity: 10, inStock: true },
          { size: "M", color: "Black", sku: "VNX-TEE-M-BLK", quantity: 8, inStock: true },
          { size: "L", color: "White", sku: "VNX-TEE-L-WHT", quantity: 0, inStock: false }
        ]
      }
    }
  });

  console.log("Seeded:", product.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
