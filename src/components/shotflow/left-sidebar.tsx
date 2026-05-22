"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Filter, Folder, GripVertical, Plus, Search, Tags } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { GROUP_COLORS, STATUS_OPTIONS } from "@/lib/shotflow-constants";
import { cn } from "@/lib/utils";
import { useShotflowStore } from "@/stores/use-shotflow-store";
import type { SceneCard, SceneGroup, ShotStatus } from "@/types/shotflow";

const SCENE_DND = "SCENE_CARD";

function GroupDrop({
  group,
  children
}: {
  group?: SceneGroup;
  children: React.ReactNode;
}) {
  const moveSceneToGroup = useShotflowStore((state) => state.moveSceneToGroup);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: SCENE_DND,
      drop: (item: { sceneId: string }) => moveSceneToGroup(item.sceneId, group?.id ?? null),
      collect: (monitor) => ({ isOver: monitor.isOver() })
    }),
    [group?.id, moveSceneToGroup]
  );

  return (
    <div ref={drop} className={cn("rounded-md transition", isOver && "bg-cinema-red/10 ring-1 ring-cinema-red/50")}>
      {children}
    </div>
  );
}

function SceneRow({ scene }: { scene: SceneCard }) {
  const selectedSceneId = useShotflowStore((state) => state.selectedSceneId);
  const shots = useShotflowStore((state) => state.project.shots);
  const selectScene = useShotflowStore((state) => state.selectScene);
  const reorderScene = useShotflowStore((state) => state.reorderScene);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: SCENE_DND,
      item: { sceneId: scene.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() })
    }),
    [scene.id]
  );
  const [, drop] = useDrop(
    () => ({
      accept: SCENE_DND,
      hover: (item: { sceneId: string }) => {
        if (item.sceneId !== scene.id) reorderScene(item.sceneId, scene.id);
      }
    }),
    [scene.id, reorderScene]
  );

  const shotCount = shots.filter((shot) => shot.sceneId === scene.id).length;
  const selected = selectedSceneId === scene.id;

  return (
    <motion.button
      ref={(node) => {
        drag(drop(node));
      }}
      layout
      type="button"
      onClick={() => selectScene(scene.id)}
      className={cn(
        "group w-full rounded-md border border-transparent px-2 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.04]",
        selected && "border-cinema-red/50 bg-cinema-red/[0.12] shadow-glow",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1 h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-cinema-ember">SC {scene.number}</span>
            <Badge variant="outline" className="shrink-0 border-white/10 bg-black/30">
              {shotCount} shots
            </Badge>
          </div>
          <div className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-100">{scene.heading}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{scene.synopsis || "No synopsis generated yet."}</div>
          <Progress value={scene.progress} className="mt-2 h-1" />
        </div>
      </div>
    </motion.button>
  );
}

function GroupBlock({ group, scenes }: { group: SceneGroup; scenes: SceneCard[] }) {
  const updateGroup = useShotflowStore((state) => state.updateGroup);
  const [renaming, setRenaming] = useState(false);

  return (
    <GroupDrop group={group}>
      <div className="mb-2 rounded-md border border-white/10 bg-zinc-950/80">
        <div className="flex items-center gap-2 border-b border-white/10 px-2 py-2">
          <button
            type="button"
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })}
          >
            {group.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
          {renaming ? (
            <Input
              autoFocus
              value={group.name}
              onChange={(event) => updateGroup(group.id, { name: event.target.value })}
              onBlur={() => setRenaming(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setRenaming(false);
              }}
              className="h-7 border-white/10 bg-black text-xs"
            />
          ) : (
            <button type="button" onDoubleClick={() => setRenaming(true)} className="min-w-0 flex-1 truncate text-left text-xs font-semibold uppercase text-zinc-300">
              {group.name}
            </button>
          )}
          <Badge variant="outline">{scenes.length}</Badge>
        </div>
        <div className="flex gap-1 px-2 py-2">
          {GROUP_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn("h-4 w-4 rounded-full border border-white/20", group.color === color && "ring-2 ring-white")}
              style={{ backgroundColor: color }}
              onClick={() => updateGroup(group.id, { color })}
              title={color}
            />
          ))}
        </div>
        {!group.collapsed ? (
          <motion.div layout className="space-y-2 p-2 pt-0">
            {scenes.map((scene) => (
              <SceneRow key={scene.id} scene={scene} />
            ))}
          </motion.div>
        ) : null}
      </div>
    </GroupDrop>
  );
}

export function LeftSidebar() {
  const project = useShotflowStore((state) => state.project);
  const search = useShotflowStore((state) => state.search);
  const filterStatus = useShotflowStore((state) => state.filterStatus);
  const setSearch = useShotflowStore((state) => state.setSearch);
  const setFilterStatus = useShotflowStore((state) => state.setFilterStatus);
  const addGroup = useShotflowStore((state) => state.addGroup);

  const filteredScenes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return project.scenes
      .filter((scene) => {
        const matchesSearch = !query || `${scene.heading} ${scene.synopsis} ${scene.number}`.toLowerCase().includes(query);
        const sceneShots = project.shots.filter((shot) => shot.sceneId === scene.id);
        const matchesStatus = filterStatus === "ALL" || sceneShots.some((shot) => shot.status === filterStatus);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.order - b.order);
  }, [filterStatus, project.scenes, project.shots, search]);

  const grouped = project.groups
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      group,
      scenes: filteredScenes.filter((scene) => scene.groupId === group.id)
    }));
  const ungrouped = filteredScenes.filter((scene) => !scene.groupId);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-white/10 bg-black/70">
      <div className="border-b border-white/10 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase text-zinc-500">Scenes</div>
            <div className="text-sm font-semibold text-zinc-100">Breakdown Navigator</div>
          </div>
          <Button variant="metal" size="sm" onClick={addGroup}>
            <Plus className="h-4 w-4" />
            Group
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search scenes" className="pl-9" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "ALL" | ShotStatus)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All shot statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {grouped.map(({ group, scenes }) => (
            <GroupBlock key={group.id} group={group} scenes={scenes} />
          ))}

          <GroupDrop>
            <div className="rounded-md border border-white/10 bg-zinc-950/70 p-2">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase text-zinc-500">
                <Tags className="h-3.5 w-3.5" />
                Ungrouped
                <Badge variant="outline" className="ml-auto">
                  {ungrouped.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {ungrouped.map((scene) => (
                  <SceneRow key={scene.id} scene={scene} />
                ))}
              </div>
            </div>
          </GroupDrop>

          {filteredScenes.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 p-5 text-center text-sm text-zinc-500">
              <Folder className="mx-auto mb-2 h-5 w-5" />
              No scenes match the current filter.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
