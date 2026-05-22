import { NextResponse } from "next/server";
import { saveProjectToDrive } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";
import { saveProjectSnapshot } from "@/lib/project-persistence";
import { requireUser } from "@/lib/supabase/server";
import type { ProjectSnapshot } from "@/types/shotflow";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { project: ProjectSnapshot; accessToken?: string };
    await saveProjectSnapshot(user.id, body.project);
    const file = await saveProjectToDrive(body.project, body.accessToken || "", body.project.driveFileId);
    await prisma.driveSync.upsert({
      where: { projectId: body.project.id },
      create: {
        projectId: body.project.id,
        driveFileId: file.id || undefined,
        status: "synced",
        lastSyncedAt: new Date()
      },
      update: {
        driveFileId: file.id || undefined,
        status: "synced",
        lastSyncedAt: new Date()
      }
    });
    return NextResponse.json({ file, syncedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Drive sync failed." }, { status: 500 });
  }
}
