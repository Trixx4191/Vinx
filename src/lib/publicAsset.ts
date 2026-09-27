import { existsSync } from "fs";
import path from "path";

/**
 * Check that a file referenced from `/public` actually exists on disk.
 *
 * Why this exists: the homepage referenced six images by path and five of them
 * were absent. `next/image` cannot know that — it emits a URL, the browser
 * requests it, gets a 404, and the layout is left with an empty frame and no
 * error anywhere a developer would look. A filename typo, a renamed asset or a
 * file that was never added all fail the same silent way.
 *
 * This is a guard, not a guarantee. It runs server-side only, and it checks the
 * filesystem rather than whatever ends up serving the asset, so a CDN that has
 * not yet picked up a deploy is still invisible to it. Its job is to catch the
 * common case — the file is simply not there — and let the page degrade
 * deliberately instead of accidentally.
 */
export function publicFileExists(publicPath: string): boolean {
  // Only ever resolve inside public/: a caller passing "../.env" must not be
  // able to probe for files outside it.
  const normalised = path.posix.normalize(publicPath).replace(/^\/+/, "");
  if (normalised.startsWith("..")) return false;

  return existsSync(path.join(process.cwd(), "public", normalised));
}

/**
 * The first path in the list whose file is present, or null when none are.
 * A caller that gets null should render something deliberate — a plain tile,
 * a colour field — rather than an <img> pointing at nothing.
 */
export function firstExistingImage(...candidates: Array<string | undefined | null>): string | null {
  for (const candidate of candidates) {
    if (candidate && publicFileExists(candidate)) return candidate;
  }
  return null;
}
