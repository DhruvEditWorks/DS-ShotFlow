import { NextResponse } from "next/server";
import { saveProjectSnapshot, toProjectSnapshot } from "@/lib/project-persistence";
import { requireUser } from "@/lib/supabase/server";
import type { ProjectSnapshot } from "@/types/shotflow";

type Context = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    const body = (await request.json()) as { project: ProjectSnapshot };
    const saved = await saveProjectSnapshot(user.id, { ...body.project, id: projectId });
    return NextResponse.json({ project: toProjectSnapshot(saved), savedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Autosave failed." }, { status: 500 });
  }
}
