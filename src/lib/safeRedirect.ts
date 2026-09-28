/**
 * A post-login destination that can only ever be a page on this site.
 *
 * The login page used to accept any `callbackUrl` beginning with "/". That
 * looks like "a local path" and is not: "//evil.example" also begins with "/",
 * and browsers read a leading "//" as a protocol-relative URL to another host.
 * "/\evil.example" is normalised the same way by several browsers. Either lets
 * someone send a genuine Vinx login link that forwards the shopper, freshly
 * signed in and trusting the page, to a lookalike site — an open redirect, and
 * the standard shape of a phishing link.
 *
 * Anything that is not unambiguously a same-site path falls back to `fallback`.
 */
export function safeCallbackPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  // Second character "/" or "\" makes it host-relative, not path-relative.
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters (a tab or newline inside "/\t/evil") are stripped by
  // URL parsers before the "//" check would ever see them.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
