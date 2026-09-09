import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/requireAdmin";
import { restockRowSchema } from "@/lib/validation";
import { withSafeErrors } from "@/lib/safeErrors";

// Expected body: { csv: "sku,quantity\nVNX-TEE-S-BLK,25\nVNX-TEE-M-BLK,10" }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    if (!body?.csv || typeof body.csv !== "string") {
      return NextResponse.json({ error: "Missing CSV content" }, { status: 400 });
    }

    const lines = body.csv
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    // Skip an optional header row like "sku,quantity"
    const dataLines = lines[0]?.toLowerCase().startsWith("sku") ? lines.slice(1) : lines;

    const rows: { sku: string; quantity: number }[] = [];
    const errors: string[] = [];

    for (const [i, line] of dataLines.entries()) {
      const [sku, qtyRaw] = line.split(",").map((s: string) => s.trim());
      const quantity = Number(qtyRaw);
      const parsed = restockRowSchema.safeParse({ sku, quantity });

      if (!parsed.success) {
        errors.push(`Row ${i + 1}: ${parsed.error.errors[0]?.message ?? "invalid"}`);
        continue;
      }
      rows.push(parsed.data);
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows", details: errors }, { status: 400 });
    }

    const results = [];
    for (const row of rows) {
      const variant = await prisma.productVariant.findUnique({ where: { sku: row.sku } });
      if (!variant) {
        errors.push(`SKU not found: ${row.sku}`);
        continue;
      }

      const updated = await prisma.productVariant.update({
        where: { sku: row.sku },
        data: { quantity: row.quantity, inStock: row.quantity > 0 }
      });
      results.push(updated);
    }

    await logAdminAction(admin.session.user!.id!, "product.restock", "ProductVariant", undefined, {
      updated: results.length,
      skus: results.map((r) => r.sku)
    });

    return NextResponse.json({ updated: results.length, errors });
  });
}
