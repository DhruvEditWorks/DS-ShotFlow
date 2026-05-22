import { NextResponse } from "next/server";
import { createUploadSignature } from "@/lib/cloudinary";
import { requireUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json().catch(() => ({}))) as { folder?: string };
    return NextResponse.json(createUploadSignature(body.folder || "ds-shotflow"));
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create upload signature." }, { status: 500 });
  }
}
