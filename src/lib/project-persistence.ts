import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ProjectSnapshot, ShotStatus } from "@/types/shotflow";

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    groups: true;
    scenes: true;
    shots: true;
    columns: true;
    versions: true;
    driveSync: true;
  };
}>;

export function toProjectSnapshot(project: ProjectWithRelations): ProjectSnapshot {
  return {
    id: project.id,
    title: project.title,
    sourceName: project.sourceName || undefined,
    sourceType: project.sourceType || undefined,
    groups: project.groups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        id: group.id,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        order: group.order
      })),
    scenes: project.scenes
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((scene) => ({
        id: scene.id,
        number: scene.number,
        heading: scene.heading,
        synopsis: scene.synopsis || undefined,
        scriptText: scene.scriptText || undefined,
        groupId: scene.groupId,
        color: scene.color || undefined,
        order: scene.order,
        progress: scene.progress
      })),
    shots: project.shots
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((shot) => ({
        id: shot.id,
        sceneId: shot.sceneId,
        sceneNumber: project.scenes.find((scene) => scene.id === shot.sceneId)?.number ?? "",
        shotNumber: shot.shotNumber,
        description: shot.description,
        subject: shot.subject,
        shotSize: shot.shotSize,
        shotType: shot.shotType,
        movement: shot.movement,
        duration: shot.duration,
        lens: shot.lens || undefined,
        fps: shot.fps || undefined,
        audio: shot.audio || undefined,
        lighting: shot.lighting || undefined,
        notes: shot.notes || undefined,
        props: shot.props || undefined,
        vfx: shot.vfx || undefined,
        cameraHeight: shot.cameraHeight || undefined,
        framing: shot.framing || undefined,
        focus: shot.focus || undefined,
        imageUrl: shot.imageUrl || undefined,
        status: shot.status as ShotStatus,
        order: shot.order,
        createdAt: shot.createdAt.toISOString(),
        updatedAt: shot.updatedAt.toISOString()
      })),
    columns: project.columns
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((column) => ({
        key: column.key as ProjectSnapshot["columns"][number]["key"],
        label: column.label,
        enabled: column.enabled,
        width: column.width || 160,
        order: column.order
      })),
    presets: {
      shotSize: [],
      shotType: [],
      movement: [],
      cameraHeight: [],
      framing: [],
      focus: []
    },
    directorNotes: String((project.metadata as Record<string, unknown>)?.directorNotes || ""),
    cinematographerNotes: String((project.metadata as Record<string, unknown>)?.cinematographerNotes || ""),
    driveFileId: project.driveSync?.driveFileId || undefined,
    versions: project.versions.map((version) => ({
      id: version.id,
      label: version.label,
      createdAt: version.createdAt.toISOString(),
      payload: version.payload as ProjectSnapshot
    })),
    updatedAt: project.updatedAt.toISOString()
  };
}

export async function saveProjectSnapshot(ownerId: string, snapshot: ProjectSnapshot) {
  const slug = slugify(snapshot.title || "untitled-project") || "untitled-project";

  return prisma.$transaction(async (tx) => {
    const existing = await tx.project.findUnique({ where: { id: snapshot.id }, select: { ownerId: true } });
    if (existing && existing.ownerId !== ownerId) {
      throw new Error("Project belongs to another user.");
    }

    await tx.project.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        ownerId,
        title: snapshot.title,
        slug,
        sourceName: snapshot.sourceName,
        sourceType: snapshot.sourceType,
        metadata: {
          directorNotes: snapshot.directorNotes,
          cinematographerNotes: snapshot.cinematographerNotes
        }
      },
      update: {
        title: snapshot.title,
        slug,
        sourceName: snapshot.sourceName,
        sourceType: snapshot.sourceType,
        metadata: {
          directorNotes: snapshot.directorNotes,
          cinematographerNotes: snapshot.cinematographerNotes
        },
        saveStatus: "saved"
      }
    });

    await tx.shot.deleteMany({ where: { projectId: snapshot.id } });
    await tx.scene.deleteMany({ where: { projectId: snapshot.id } });
    await tx.sceneGroup.deleteMany({ where: { projectId: snapshot.id } });
    await tx.columnPreference.deleteMany({ where: { projectId: snapshot.id } });

    if (snapshot.groups.length) {
      await tx.sceneGroup.createMany({
        data: snapshot.groups.map((group) => ({
          id: group.id,
          projectId: snapshot.id,
          name: group.name,
          color: group.color,
          collapsed: group.collapsed,
          order: group.order
        }))
      });
    }

    if (snapshot.scenes.length) {
      await tx.scene.createMany({
        data: snapshot.scenes.map((scene) => ({
          id: scene.id,
          projectId: snapshot.id,
          groupId: scene.groupId || null,
          number: scene.number,
          heading: scene.heading,
          synopsis: scene.synopsis,
          scriptText: scene.scriptText,
          color: scene.color,
          order: scene.order,
          progress: scene.progress
        }))
      });
    }

    if (snapshot.shots.length) {
      await tx.shot.createMany({
        data: snapshot.shots.map((shot) => ({
          id: shot.id,
          projectId: snapshot.id,
          sceneId: shot.sceneId,
          shotNumber: shot.shotNumber,
          description: shot.description,
          subject: shot.subject,
          shotSize: shot.shotSize,
          shotType: shot.shotType,
          movement: shot.movement,
          duration: shot.duration,
          lens: shot.lens,
          fps: shot.fps,
          audio: shot.audio,
          lighting: shot.lighting,
          notes: shot.notes,
          props: shot.props,
          vfx: shot.vfx,
          cameraHeight: shot.cameraHeight,
          framing: shot.framing,
          focus: shot.focus,
          imageUrl: shot.imageUrl,
          status: shot.status,
          order: shot.order
        }))
      });
    }

    if (snapshot.columns.length) {
      await tx.columnPreference.createMany({
        data: snapshot.columns.map((column) => ({
          projectId: snapshot.id,
          key: column.key,
          label: column.label,
          enabled: column.enabled,
          width: column.width,
          order: column.order
        }))
      });
    }

    if (snapshot.driveFileId) {
      await tx.driveSync.upsert({
        where: { projectId: snapshot.id },
        create: {
          projectId: snapshot.id,
          driveFileId: snapshot.driveFileId,
          status: "synced",
          lastSyncedAt: new Date()
        },
        update: {
          driveFileId: snapshot.driveFileId,
          status: "synced",
          lastSyncedAt: new Date()
        }
      });
    }

    return tx.project.findUniqueOrThrow({
      where: { id: snapshot.id },
      include: {
        groups: true,
        scenes: true,
        shots: true,
        columns: true,
        versions: true,
        driveSync: true
      }
    });
  });
}
