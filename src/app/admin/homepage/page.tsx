import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { readSettings } from "@/lib/siteSettings";
import HomepageForm from "./HomepageForm";

export default async function AdminHomepagePage() {
  // Independent re-check, like every admin page.
  const session = await getServerSession(authOptions);
  if (!isAdminRole((session?.user as { role?: string } | undefined)?.role)) redirect("/");

  const settings = await readSettings();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="admin-kicker">Storefront</p>
        <h1 className="type-d3 mt-2 text-soft-800">Homepage</h1>
        <p className="mt-2 text-sm text-soft-500">What a visitor sees before the products.</p>
      </div>
      <HomepageForm heroImageUrl={settings.heroImageUrl ?? ""} />
    </div>
  );
}
