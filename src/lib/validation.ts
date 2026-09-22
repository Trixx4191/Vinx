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

// A media URL is either an absolute URL (the normal case — an object in your
// bucket) or a root-relative /uploads/... path, which is what the
// development-only local upload fallback produces. Plain `.url()` rejects the
// relative form, so a locally uploaded image would fail validation on save.
//
// The relative branch is deliberately narrow: only /uploads/ and no "..", so
// this can't be used to point a product at an arbitrary path on the site.
const mediaUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) =>
      /^https?:\/\//.test(value)
        ? z.string().url().safeParse(value).success
        : value.startsWith("/uploads/") && !value.includes(".."),
    { message: "Must be a valid URL or an /uploads/ path" }
  );

// An empty string from an untouched form field is normalised to "not set"
// rather than rejected, so a blank optional input never blocks a save.
const optionalMediaUrl = mediaUrl
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  material: z.string().trim().min(1).max(200),
  price: z.number().int().positive(), // minor units
  currency: z.string().trim().length(3).default("GHS"),
  categorySlug: z.string().trim().min(1),
  frontImageUrl: mediaUrl,
  backImageUrl: mediaUrl,
  hoverVideoUrl: optionalMediaUrl,
  galleryImages: z.array(mediaUrl).max(8).default([]),
  variants: z.array(productVariantSchema).min(1),
  isPublished: z.boolean().default(true)
});

// Staff management. Only a SUPER_ADMIN can submit either of these.
export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  role: z.enum(["ADMIN", "SUPER_ADMIN"])
});

// "Revoking" an admin sets them back to CUSTOMER rather than deleting the
// user. Their orders and audit-log entries reference the row, and the audit
// trail is append-only by design — deleting the account would either fail on
// those foreign keys or erase history that exists precisely to be kept.
export const updateStaffRoleSchema = z.object({
  role: z.enum(["ADMIN", "SUPER_ADMIN", "CUSTOMER"])
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
