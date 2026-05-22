import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/supabase/server";
import type { ProjectSnapshot } from "@/types/shotflow";

type Context = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: user.id } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const versions = await prisma.versionHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 30
    });
    return NextResponse.json({ versions });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to load versions." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { projectId } = await params;
    const body = (await request.json()) as { label?: string; payload: ProjectSnapshot };
    const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: user.id } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const version = await prisma.versionHistory.create({
      data: {
        projectId,
        label: body.label || "Manual checkpoint",
        payload: body.payload,
        createdBy: user.id
      }
    });

    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to create version." }, { status: 500 });
  }
}
