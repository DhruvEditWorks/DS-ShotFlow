import { NextResponse } from "next/server";
import { loadProjectFromDrive } from "@/lib/google-drive";
import { requireUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json()) as { accessToken?: string; fileId?: string };
    if (!body.accessToken || !body.fileId) {
      return NextResponse.json({ error: "Drive access token and file id are required." }, { status: 400 });
    }
    const project = await loadProjectFromDrive(body.accessToken, body.fileId);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Drive load failed." }, { status: 500 });
  }
}
