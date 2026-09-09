/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't tell every visitor's devtools "this is Next.js" for free.
  poweredByHeader: false,
  // Don't ship a map from minified bundle back to original source in prod —
  // makes casual reverse-engineering of client code meaningfully harder.
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
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
            value:
              "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
