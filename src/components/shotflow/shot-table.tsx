"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { Copy, GripVertical, ImagePlus, MoreHorizontal, Plus, Rows3, Trash2 } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { CAMERA_HEIGHT_OPTIONS, MOVEMENT_OPTIONS, SHOT_SIZE_OPTIONS, SHOT_TYPE_OPTIONS, STATUS_OPTIONS } from "@/lib/shotflow-constants";
import { uploadImageWithPreview } from "@/lib/client-image";
import { cn } from "@/lib/utils";
import { selectVisibleColumns, useShotflowStore } from "@/stores/use-shotflow-store";
import type { ColumnKey, Shot, ShotColumn, ShotStatus } from "@/types/shotflow";

const SHOT_DND = "SHOT_ROW";

function shotValue(shot: Shot, key: ColumnKey) {
  if (key === "shot") return shot.shotNumber;
  if (key === "scene") return shot.sceneNumber;
  return String(shot[key] ?? "");
}

function patchForColumn(key: ColumnKey, value: string): Partial<Shot> {
  if (key === "shot") return { shotNumber: value };
  if (key === "scene") return { sceneNumber: value };
  return { [key]: value } as Partial<Shot>;
}

function focusRelative(event: React.KeyboardEvent<HTMLElement>, offset: number) {
  const current = event.currentTarget.closest("[data-cell-index]") as HTMLElement | null;
  const index = Number(current?.dataset.cellIndex);
  if (Number.isNaN(index)) return;
  const next = document.querySelector<HTMLElement>(`[data-cell-index="${index + offset}"] input, [data-cell-index="${index + offset}"] button`);
  next?.focus();
}

function PresetSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const allOptions = Array.from(new Set([value, ...options].filter(Boolean)));
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-full rounded-none border-0 bg-transparent px-3 text-xs focus:ring-1 focus:ring-cinema-red">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ImageCell({ shot }: { shot: Shot }) {
  const setShotImage = useShotflowStore((state) => state.setShotImage);
  const inputRef = useRef<HTMLInputElement>(null);

  async function setFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const imageUrl = await uploadImageWithPreview(file, `ds-shotflow/${shot.sceneId}`);
    setShotImage(shot.id, imageUrl);
  }

  return (
    <div
      className="flex h-full items-center justify-center p-2"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setFile(event.dataTransfer.files?.[0]);
      }}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
        setFile(file);
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0])} />
      <button
        type="button"
        className="relative h-12 w-20 overflow-hidden rounded border border-white/10 bg-zinc-900 text-zinc-500 transition hover:border-cinema-red/60"
        onClick={() => inputRef.current?.click()}
        title="Upload, drop, or paste image"
      >
        {shot.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImagePlus className="mx-auto h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function EditableCell({
  shot,
  column,
  cellIndex
}: {
  shot: Shot;
  column: ShotColumn;
  cellIndex: number;
}) {
  const updateShot = useShotflowStore((state) => state.updateShot);
  const presets = useShotflowStore((state) => state.project.presets);

  if (column.key === "image") return <ImageCell shot={shot} />;

  if (column.key === "shotSize") {
    return (
      <PresetSelect
        value={shot.shotSize}
        options={[...SHOT_SIZE_OPTIONS, ...presets.shotSize]}
        onChange={(value) => updateShot(shot.id, { shotSize: value })}
      />
    );
  }

  if (column.key === "shotType") {
    return (
      <PresetSelect
        value={shot.shotType}
        options={[...SHOT_TYPE_OPTIONS, ...presets.shotType]}
        onChange={(value) => updateShot(shot.id, { shotType: value })}
      />
    );
  }

  if (column.key === "movement") {
    return (
      <PresetSelect
        value={shot.movement}
        options={[...MOVEMENT_OPTIONS, ...presets.movement]}
        onChange={(value) => updateShot(shot.id, { movement: value })}
      />
    );
  }

  if (column.key === "cameraHeight") {
    return (
      <PresetSelect
        value={shot.cameraHeight || "Eye Level"}
        options={[...CAMERA_HEIGHT_OPTIONS, ...presets.cameraHeight]}
        onChange={(value) => updateShot(shot.id, { cameraHeight: value })}
      />
    );
  }

  const readOnly = column.key === "scene";
  return (
    <div data-cell-index={cellIndex} className="h-full">
      <input
        value={shotValue(shot, column.key)}
        readOnly={readOnly}
        onChange={(event) => updateShot(shot.id, patchForColumn(column.key, event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "ArrowRight") focusRelative(event, 1);
          if (event.key === "ArrowLeft") focusRelative(event, -1);
        }}
        className={cn("cell-input", readOnly && "text-zinc-500")}
      />
    </div>
  );
}

function ShotRow({
  shot,
  columns,
  gridTemplateColumns,
  index,
  virtualTop
}: {
  shot: Shot;
  columns: ShotColumn[];
  gridTemplateColumns: string;
  index: number;
  virtualTop: number;
}) {
  const activeShotId = useShotflowStore((state) => state.activeShotId);
  const selectedShotIds = useShotflowStore((state) => state.selectedShotIds);
  const toggleShotSelection = useShotflowStore((state) => state.toggleShotSelection);
  const selectShotRange = useShotflowStore((state) => state.selectShotRange);
  const setActiveShot = useShotflowStore((state) => state.setActiveShot);
  const duplicateShot = useShotflowStore((state) => state.duplicateShot);
  const deleteShots = useShotflowStore((state) => state.deleteShots);
  const reorderShot = useShotflowStore((state) => state.reorderShot);
  const updateShot = useShotflowStore((state) => state.updateShot);

  const selected = selectedShotIds.includes(shot.id);
  const active = activeShotId === shot.id;
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: SHOT_DND,
      item: { shotId: shot.id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() })
    }),
    [shot.id]
  );
  const [, drop] = useDrop(
    () => ({
      accept: SHOT_DND,
      hover: (item: { shotId: string }) => {
        if (item.shotId !== shot.id) reorderShot(item.shotId, shot.id);
      }
    }),
    [shot.id, reorderShot]
  );

  return (
    <motion.div
      ref={(node) => {
        drag(drop(node));
      }}
      initial={false}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      className={cn("absolute left-0 right-0 grid min-w-max border-b border-white/10 bg-zinc-950/80 shadow-row transition", active && "bg-cinema-red/[0.09]", selected && "ring-1 ring-inset ring-cinema-red/50")}
      style={{
        gridTemplateColumns,
        height: 72,
        transform: `translateY(${virtualTop}px)`
      }}
      onClick={(event) => {
        if (event.shiftKey) selectShotRange(shot.id);
        else toggleShotSelection(shot.id, event.metaKey || event.ctrlKey);
        setActiveShot(shot.id);
      }}
    >
      <div className="flex items-center justify-center border-r border-white/10 text-zinc-600">
        <GripVertical className="h-4 w-4" />
      </div>
      {columns.map((column, columnIndex) => (
        <div key={column.key} className="min-w-0 border-r border-white/10" style={{ width: column.width }}>
          <EditableCell shot={shot} column={column} cellIndex={index * columns.length + columnIndex} />
        </div>
      ))}
      <div className="flex items-center justify-center gap-1">
        <Select value={shot.status} onValueChange={(value) => updateShot(shot.id, { status: value as ShotStatus })}>
          <SelectTrigger className="h-7 w-7 rounded border-white/10 px-0 text-transparent [&>svg]:hidden" title="Progress">
            <span
              className={cn(
                "mx-auto h-2.5 w-2.5 rounded-full",
                shot.status === "COMPLETE" || shot.status === "CUT" ? "bg-emerald-400" : shot.status === "SHOOTING" ? "bg-cinema-red" : shot.status === "READY" ? "bg-yellow-400" : "bg-zinc-600"
              )}
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => duplicateShot(shot.id)}>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteShots([shot.id])}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export function ShotTable() {
  const parentRef = useRef<HTMLDivElement>(null);
  const project = useShotflowStore((state) => state.project);
  const selectedSceneId = useShotflowStore((state) => state.selectedSceneId);
  const filterStatus = useShotflowStore((state) => state.filterStatus);
  const addShot = useShotflowStore((state) => state.addShot);
  const copySelectedShots = useShotflowStore((state) => state.copySelectedShots);
  const pasteShots = useShotflowStore((state) => state.pasteShots);
  const deleteShots = useShotflowStore((state) => state.deleteShots);

  const scene = project.scenes.find((item) => item.id === selectedSceneId);
  const columns = useMemo(() => selectVisibleColumns(project.columns), [project.columns]);
  const shots = useMemo(
    () =>
      project.shots
        .filter((shot) => shot.sceneId === selectedSceneId)
        .filter((shot) => filterStatus === "ALL" || shot.status === filterStatus)
        .sort((a, b) => a.order - b.order),
    [filterStatus, project.shots, selectedSceneId]
  );
  const gridTemplateColumns = `42px ${columns.map((column) => `${column.width}px`).join(" ")} 84px`;

  const rowVirtualizer = useVirtualizer({
    count: shots.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10
  });

  if (!scene) {
    return (
      <main className="flex flex-1 items-center justify-center text-zinc-500">
        Select or import a scene to begin shotlisting.
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950/[0.55]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase text-cinema-ember">Scene {scene.number}</div>
          <h1 className="truncate text-xl font-semibold text-white">{scene.heading}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="metal" size="sm" onClick={copySelectedShots}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button variant="metal" size="sm" onClick={() => pasteShots()}>
            <Rows3 className="h-4 w-4" />
            Paste
          </Button>
          <Button variant="metal" size="sm" onClick={() => deleteShots()}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button size="sm" onClick={() => addShot(scene.id)}>
            <Plus className="h-4 w-4" />
            Shot
          </Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="h-full overflow-auto" ref={parentRef}>
          <div className="sticky top-0 z-20 grid min-w-max border-b border-white/10 bg-black/95 text-xs font-semibold uppercase text-zinc-500 shadow-xl" style={{ gridTemplateColumns }}>
            <div className="border-r border-white/10 px-2 py-3" />
            {columns.map((column) => (
              <div key={column.key} className="border-r border-white/10 px-3 py-3" style={{ width: column.width }}>
                {column.label}
              </div>
            ))}
            <div className="px-3 py-3">Status</div>
          </div>
          <div className="relative min-w-max" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const shot = shots[virtualRow.index];
              return (
                <ShotRow
                  key={shot.id}
                  shot={shot}
                  columns={columns}
                  gridTemplateColumns={gridTemplateColumns}
                  index={virtualRow.index}
                  virtualTop={virtualRow.start}
                />
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
