import { z } from "zod";

// Password policy: minimum 10 chars, at least one letter and one number.
// Length matters far more than complexity theater (see NIST 800-63B),
// but we still nudge away from purely-numeric or trivial passwords.
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-zA-Z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema
});

export type SignupInput = z.infer<typeof signupSchema>;

export const productVariantSchema = z.object({
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(40),
  sku: z.string().trim().min(1).max(60),
  quantity: z.number().int().min(0)
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  material: z.string().trim().min(1).max(200),
  price: z.number().int().positive(), // minor units
  currency: z.string().trim().length(3).default("GHS"),
  categorySlug: z.string().trim().min(1),
  frontImageUrl: z.string().url(),
  backImageUrl: z.string().url(),
  variants: z.array(productVariantSchema).min(1),
  isPublished: z.boolean().default(true)
});

export const restockRowSchema = z.object({
  sku: z.string().trim().min(1),
  quantity: z.number().int().min(0)
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "FAILED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  carrier: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  trackingUrl: z.string().trim().url().optional().or(z.literal("")),
  estimatedDelivery: z.string().datetime().optional().or(z.literal("")),
  note: z.string().trim().max(500).optional()
});

export const checkoutSchema = z.object({
  // Only identity + quantity ever come from the client. Price is
  // deliberately absent from this schema — it is looked up server-side
  // from the database and cannot be supplied or overridden by the caller.
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(50)
      })
    )
    .min(1)
    .max(50),
  address: z.object({
    fullName: z.string().trim().min(1).max(150),
    phone: z.string().trim().min(6).max(20),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    region: z.string().trim().min(1).max(100),
    country: z.string().trim().length(2).default("GH")
  }),
  paymentProvider: z.enum(["STRIPE", "PAYPAL", "PAYSTACK"])
});
