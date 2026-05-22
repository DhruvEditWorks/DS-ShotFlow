import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveProjectSnapshot, toProjectSnapshot } from "@/lib/project-persistence";
import { requireUser } from "@/lib/supabase/server";
import type { ProjectSnapshot } from "@/types/shotflow";

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { scenes: true, shots: true }
        },
        driveSync: true
      }
    });

    return NextResponse.json({
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        updatedAt: project.updatedAt,
        scenes: project._count.scenes,
        shots: project._count.shots,
        driveFileId: project.driveSync?.driveFileId
      }))
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to load projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { project: ProjectSnapshot };
    const saved = await saveProjectSnapshot(user.id, body.project);
    return NextResponse.json({ project: toProjectSnapshot(saved) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save project." }, { status: 500 });
  }
}
