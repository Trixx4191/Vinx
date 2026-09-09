import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SecurityForm from "./SecurityForm";

export default async function AdminSecurityPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/");

  return <SecurityForm />;
}
