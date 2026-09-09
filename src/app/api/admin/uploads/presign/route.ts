import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { getPresignedUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const filename = body?.filename;
    const contentType = body?.contentType;

    if (typeof filename !== "string" || typeof contentType !== "string") {
      return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
    }

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename, contentType);

    return NextResponse.json({ uploadUrl, publicUrl });
  });
}
