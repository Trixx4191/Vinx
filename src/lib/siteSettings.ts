import { prisma } from "@/lib/prisma";

/** Every setting the storefront reads. The API refuses any key not listed. */
export const SETTING_KEYS = ["heroImageUrl", "vipPriceMonth", "vipPriceYear"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * Read storefront settings.
 *
 * Never throws. These drive decoration — the homepage hero — and a database
 * that is asleep or unreachable must not turn "no hero image" into "no
 * homepage". A failure reads as every setting unset, and the page renders
 * without them.
 */
export async function readSettings(): Promise<Partial<Record<SettingKey, string>>> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } }
    });
    const settings: Partial<Record<SettingKey, string>> = {};
    for (const row of rows) {
      if (row.value) settings[row.key as SettingKey] = row.value;
    }
    return settings;
  } catch (error) {
    console.error("[settings] could not read site settings", error);
    return {};
  }
}
