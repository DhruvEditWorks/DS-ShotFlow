import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveProjectSnapshot, toProjectSnapshot } from "@/lib/project-persistence";
import { requireUser } from "@/lib/supabase/server";
import type { ProjectSnapshot } from "@/types/shotflow";

type Context = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      include: {
        groups: true,
        scenes: true,
        shots: true,
        columns: true,
        versions: true,
        driveSync: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project: toProjectSnapshot(project) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to load project." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    const body = (await request.json()) as { project: ProjectSnapshot };
    const snapshot = { ...body.project, id: projectId };
    const saved = await saveProjectSnapshot(user.id, snapshot);
    return NextResponse.json({ project: toProjectSnapshot(saved) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update project." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    await prisma.project.deleteMany({
      where: {
        id: projectId,
        ownerId: user.id
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to delete project." }, { status: 500 });
  }
}
