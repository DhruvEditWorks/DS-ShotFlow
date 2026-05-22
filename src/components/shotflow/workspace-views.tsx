"use client";

import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock3, Film, LayoutGrid, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useShotflowStore } from "@/stores/use-shotflow-store";
import type { Shot } from "@/types/shotflow";

function sceneForShot(shot: Shot) {
  return useShotflowStore.getState().project.scenes.find((scene) => scene.id === shot.sceneId);
}

export function StoryboardView() {
  const project = useShotflowStore((state) => state.project);
  const selectedSceneId = useShotflowStore((state) => state.selectedSceneId);
  const setActiveShot = useShotflowStore((state) => state.setActiveShot);
  const shots = project.shots.filter((shot) => shot.sceneId === selectedSceneId).sort((a, b) => a.order - b.order);

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 p-5">
        {shots.map((shot) => (
          <motion.button
            layout
            key={shot.id}
            type="button"
            onClick={() => setActiveShot(shot.id)}
            className="overflow-hidden rounded-md border border-white/10 bg-zinc-950 text-left transition hover:border-cinema-red/50"
          >
            <div className="aspect-video bg-zinc-900">
              {shot.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600">
                  <Film className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cinema-ember">{shot.shotNumber}</span>
                <Badge variant="outline">{shot.duration}</Badge>
              </div>
              <div className="line-clamp-2 text-sm font-medium text-white">{shot.description || "Untitled shot"}</div>
              <div className="text-xs text-zinc-500">{shot.shotSize} / {shot.movement}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </ScrollArea>
  );
}

export function GridModeView() {
  const project = useShotflowStore((state) => state.project);
  const setActiveShot = useShotflowStore((state) => state.setActiveShot);
  const shots = project.shots.slice().sort((a, b) => a.order - b.order);

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-5">
        {shots.map((shot) => {
          const scene = sceneForShot(shot);
          return (
            <button key={shot.id} type="button" onClick={() => setActiveShot(shot.id)} className="rounded-md border border-white/10 bg-zinc-950 p-3 text-left transition hover:border-cinema-red/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-cinema-ember">{shot.shotNumber}</span>
                <span className="text-xs text-zinc-500">{shot.status}</span>
              </div>
              <div className="line-clamp-1 text-sm font-semibold text-white">{scene?.heading}</div>
              <div className="mt-2 line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-zinc-500">{shot.description || "No description"}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {[shot.shotSize, shot.shotType, shot.movement].map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function TimelineView() {
  const project = useShotflowStore((state) => state.project);
  const shots = project.shots.slice().sort((a, b) => a.order - b.order);

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <TimerReset className="h-4 w-4 text-cinema-red" />
          Editorial Coverage Timeline
        </div>
        <div className="space-y-3">
          {shots.map((shot, index) => {
            const seconds = Number(shot.duration.split(":").pop() || 5);
            const width = Math.min(100, Math.max(18, seconds * 9));
            return (
              <div key={shot.id} className="grid grid-cols-[86px_1fr_82px] items-center gap-3">
                <span className="font-mono text-xs text-cinema-ember">{shot.shotNumber}</span>
                <div className="h-9 rounded border border-white/10 bg-zinc-950 p-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ delay: index * 0.025 }}
                    className={cn("flex h-full items-center rounded-sm px-3 text-xs font-medium text-white", index % 3 === 0 ? "bg-cinema-red" : index % 3 === 1 ? "bg-zinc-700" : "bg-zinc-500")}
                  >
                    {shot.description || shot.subject || shot.movement}
                  </motion.div>
                </div>
                <span className="text-xs text-zinc-500">{shot.duration}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

export function ScheduleView() {
  const project = useShotflowStore((state) => state.project);
  const groups = project.groups.length ? project.groups : [{ id: "ungrouped", name: "Shoot Day", color: "#d71920", collapsed: false, order: 0 }];

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 p-5">
        {groups.map((group, day) => {
          const scenes = project.scenes.filter((scene) => (group.id === "ungrouped" ? !scene.groupId : scene.groupId === group.id));
          const shots = project.shots.filter((shot) => scenes.some((scene) => scene.id === shot.sceneId));
          const complete = shots.filter((shot) => shot.status === "COMPLETE" || shot.status === "CUT").length;
          return (
            <div key={group.id} className="rounded-md border border-white/10 bg-zinc-950 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
                    <CalendarDays className="h-4 w-4" />
                    Shoot Day {day + 1}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">{group.name}</div>
                </div>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
              </div>
              <Progress value={shots.length ? Math.round((complete / shots.length) * 100) : 0} />
              <div className="mt-4 space-y-2">
                {scenes.map((scene) => (
                  <div key={scene.id} className="rounded border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-cinema-ember">Scene {scene.number}</span>
                      <Badge variant="outline">{project.shots.filter((shot) => shot.sceneId === scene.id).length} shots</Badge>
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">{scene.heading}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function AdvancedWorkspaceView() {
  const view = useShotflowStore((state) => state.view);

  return (
    <main className="min-w-0 flex-1 bg-zinc-950/[0.55]">
      {view === "storyboard" ? <StoryboardView /> : null}
      {view === "grid" ? <GridModeView /> : null}
      {view === "timeline" ? <TimelineView /> : null}
      {view === "schedule" ? <ScheduleView /> : null}
      {view === "shotlist" ? null : (
        <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 py-1 text-xs text-zinc-500 lg:flex">
          <CheckCircle2 className="h-3.5 w-3.5 text-cinema-red" />
          Autosave, offline cache, and Drive sync stay active in this view.
          <Clock3 className="h-3.5 w-3.5" />
        </div>
      )}
    </main>
  );
}
