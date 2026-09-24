/**
 * Hosts the image optimizer is allowed to fetch from.
 *
 * `hostname: "**"` means the optimizer will fetch and re-serve an image from
 * ANY https host on request. Product image URLs are admin-settable, so that
 * turns the optimizer into a general-purpose fetcher pointed wherever a stored
 * URL says — worth scoping to the bucket the images actually live in.
 *
 * The wildcard is kept as a fallback when S3_PUBLIC_URL_BASE is unset, because
 * silently refusing to render every product image would be a worse failure
 * than a loose allowlist. The warning below is there so it doesn't stay unset
 * by accident.
 */
function imageRemotePatterns() {
  const patterns = [];

  const publicBase = process.env.S3_PUBLIC_URL_BASE;
  if (publicBase) {
    try {
      patterns.push({ protocol: "https", hostname: new URL(publicBase).hostname });
    } catch {
      console.warn(`[next.config] S3_PUBLIC_URL_BASE is not a valid URL: ${publicBase}`);
    }
  }

  // Seed and editorial placeholders, development only. These are stand-ins for
  // imagery you have not shot yet; neither host is reachable in production, so
  // anything still pointing at them will fail loudly rather than ship.
  if (process.env.NODE_ENV === "development") {
    patterns.push({ protocol: "https", hostname: "placehold.co" });
    patterns.push({ protocol: "https", hostname: "images.unsplash.com" });
  }

  if (patterns.length === 0) {
    console.warn(
      "[next.config] S3_PUBLIC_URL_BASE is not set — allowing images from any https host. " +
        "Set it to scope the image optimizer to your own bucket."
    );
    return [{ protocol: "https", hostname: "**" }];
  }

  return patterns;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't tell every visitor's devtools "this is Next.js" for free.
  poweredByHeader: false,
  // Don't ship a map from minified bundle back to original source in prod —
  // makes casual reverse-engineering of client code meaningfully harder.
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: imageRemotePatterns()
    // dangerouslyAllowSVG is deliberately left off. An SVG can carry script,
    // and with admin-settable image URLs, allowing SVG through the optimizer
    // would let a stored URL serve active content from our own origin. The
    // seed uses raster placeholders instead.
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            // Baseline policy: same-origin by default, images/fonts allowed
            // from https, inline styles allowed (Tailwind + Next both need
            // this). 'unsafe-inline' on scripts is a known gap — Next.js
            // needs it for hydration data unless we wire per-request nonces,
            // which is worth doing in Phase 4 once real payment widgets
            // (Stripe/Paystack embeds) are in and we know their domains.
            //
            // media-src is explicit because product hover videos are served
            // from S3/R2/Spaces, and default-src 'self' would otherwise block
            // them silently — the <video> just never paints, with no error.
            // font-src covers the same ground for self-hosted next/font files.
            value: `default-src 'self'; img-src 'self' https: data:; media-src 'self' https: data: blob:; font-src 'self' data:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; frame-ancestors 'none';`
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
