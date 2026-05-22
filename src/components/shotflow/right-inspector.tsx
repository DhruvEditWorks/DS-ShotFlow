"use client";

import { useRef, useState } from "react";
import { Maximize2, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CAMERA_HEIGHT_OPTIONS, FOCUS_OPTIONS, FRAMING_OPTIONS, MOVEMENT_OPTIONS, SHOT_SIZE_OPTIONS, SHOT_TYPE_OPTIONS, STATUS_OPTIONS } from "@/lib/shotflow-constants";
import { uploadImageWithPreview } from "@/lib/client-image";
import { useShotflowStore } from "@/stores/use-shotflow-store";
import type { PresetKind, Shot, ShotStatus } from "@/types/shotflow";

function CustomPresetField({
  label,
  value,
  kind,
  options,
  onChange
}: {
  label: string;
  value?: string;
  kind: PresetKind;
  options: string[];
  onChange: (value: string) => void;
}) {
  const presets = useShotflowStore((state) => state.project.presets[kind]);
  const saveCustomPreset = useShotflowStore((state) => state.saveCustomPreset);
  const [custom, setCustom] = useState("");
  const [save, setSave] = useState(true);
  const allOptions = Array.from(new Set([...(value ? [value] : []), ...options, ...presets].filter(Boolean)));

  function applyCustom() {
    const trimmed = custom.trim();
    if (!trimmed) return;
    onChange(trimmed);
    if (save) saveCustomPreset(kind, trimmed);
    setCustom("");
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase text-zinc-500">{label}</label>
      <Select value={value || allOptions[0]} onValueChange={onChange}>
        <SelectTrigger>
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
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") applyCustom();
          }}
          placeholder="Custom preset"
          className="h-8"
        />
        <Button variant="metal" size="sm" onClick={applyCustom}>
          Save
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        <Checkbox checked={save} onCheckedChange={(checked) => setSave(Boolean(checked))} />
        Save Custom
      </label>
    </div>
  );
}

function ImageInspector({ shot }: { shot: Shot }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setShotImage = useShotflowStore((state) => state.setShotImage);

  async function setFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setShotImage(shot.id, await uploadImageWithPreview(file, `ds-shotflow/${shot.sceneId}`));
  }

  return (
    <div
      className="rounded-md border border-white/10 bg-black/40 p-2"
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
      <div className="relative aspect-video overflow-hidden rounded border border-white/10 bg-zinc-900">
        {shot.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-zinc-600">
            <Upload className="mb-2 h-6 w-6" />
            <span className="text-xs">Drop or paste frame</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Button variant="metal" size="sm" className="flex-1" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="metal" size="icon" disabled={!shot.imageUrl} title="Fullscreen preview">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl border-white/10 bg-black p-3">
            {shot.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot.imageUrl} alt="" className="max-h-[82vh] w-full rounded object-contain" />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function RightInspector() {
  const project = useShotflowStore((state) => state.project);
  const activeShotId = useShotflowStore((state) => state.activeShotId);
  const selectedSceneId = useShotflowStore((state) => state.selectedSceneId);
  const updateShot = useShotflowStore((state) => state.updateShot);
  const updateProjectNotes = useShotflowStore((state) => state.updateProjectNotes);
  const shot = project.shots.find((item) => item.id === activeShotId) || project.shots.find((item) => item.sceneId === selectedSceneId);
  const scene = project.scenes.find((item) => item.id === shot?.sceneId);

  if (!shot) {
    return (
      <aside className="hidden h-full w-[360px] shrink-0 border-l border-white/10 bg-black/70 p-4 text-sm text-zinc-500 xl:block">
        Select a shot to inspect metadata.
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-[360px] shrink-0 border-l border-white/10 bg-black/70 xl:block">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div>
          <div className="font-mono text-xs text-cinema-ember">{shot.shotNumber}</div>
          <div className="text-sm font-semibold text-white">Shot Inspector</div>
        </div>
        <Select value={shot.status} onValueChange={(status) => updateShot(shot.id, { status: status as ShotStatus })}>
          <SelectTrigger className="h-8 w-32">
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
      </div>

      <ScrollArea className="h-[calc(100%-4rem)]">
        <div className="space-y-5 p-4">
          <ImageInspector shot={shot} />

          <div className="rounded-md border border-white/10 bg-zinc-950/70 p-3">
            <div className="mb-3 text-xs font-semibold uppercase text-zinc-500">Scene Context</div>
            <div className="text-sm font-semibold text-white">{scene?.heading}</div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{scene?.synopsis || "No imported action lines for this scene."}</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase text-zinc-500">Description</label>
            <Textarea value={shot.description} onChange={(event) => updateShot(shot.id, { description: event.target.value })} />
            <label className="text-xs font-semibold uppercase text-zinc-500">Subject</label>
            <Input value={shot.subject} onChange={(event) => updateShot(shot.id, { subject: event.target.value })} />
          </div>

          <Separator />

          <CustomPresetField label="Shot Size" value={shot.shotSize} kind="shotSize" options={SHOT_SIZE_OPTIONS} onChange={(value) => updateShot(shot.id, { shotSize: value })} />
          <CustomPresetField label="Shot Type" value={shot.shotType} kind="shotType" options={SHOT_TYPE_OPTIONS} onChange={(value) => updateShot(shot.id, { shotType: value })} />
          <CustomPresetField label="Movement" value={shot.movement} kind="movement" options={MOVEMENT_OPTIONS} onChange={(value) => updateShot(shot.id, { movement: value })} />
          <CustomPresetField label="Camera Height" value={shot.cameraHeight} kind="cameraHeight" options={CAMERA_HEIGHT_OPTIONS} onChange={(value) => updateShot(shot.id, { cameraHeight: value })} />
          <CustomPresetField label="Framing" value={shot.framing} kind="framing" options={FRAMING_OPTIONS} onChange={(value) => updateShot(shot.id, { framing: value })} />
          <CustomPresetField label="Focus" value={shot.focus} kind="focus" options={FOCUS_OPTIONS} onChange={(value) => updateShot(shot.id, { focus: value })} />

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Lens Mood</label>
              <Input value={shot.lens || ""} onChange={(event) => updateShot(shot.id, { lens: event.target.value })} placeholder="35mm anamorphic" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Duration</label>
              <Input value={shot.duration} onChange={(event) => updateShot(shot.id, { duration: event.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Lighting Mood</label>
            <Textarea value={shot.lighting || ""} onChange={(event) => updateShot(shot.id, { lighting: event.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Notes</label>
            <Textarea value={shot.notes || ""} onChange={(event) => updateShot(shot.id, { notes: event.target.value })} />
          </div>

          <div className="rounded-md border border-cinema-red/25 bg-cinema-red/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-red-100">
              <Wand2 className="h-4 w-4" />
              Creative Notes
            </div>
            <label className="text-xs text-zinc-500">Director Notes</label>
            <Textarea className="mt-1" value={project.directorNotes} onChange={(event) => updateProjectNotes({ directorNotes: event.target.value })} />
            <label className="mt-3 block text-xs text-zinc-500">Cinematographer Notes</label>
            <Textarea className="mt-1" value={project.cinematographerNotes} onChange={(event) => updateProjectNotes({ cinematographerNotes: event.target.value })} />
          </div>

          <div className="rounded-md border border-white/10 bg-zinc-950/70 p-3">
            <div className="mb-3 text-xs font-semibold uppercase text-zinc-500">Version History</div>
            <div className="space-y-2">
              {project.versions.slice(-5).reverse().map((version) => (
                <div key={version.id} className="rounded border border-white/10 bg-black/30 px-3 py-2">
                  <div className="text-xs font-medium text-white">{version.label}</div>
                  <div className="text-[11px] text-zinc-500">{new Date(version.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {project.versions.length === 0 ? <div className="text-xs text-zinc-500">No checkpoints yet.</div> : null}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
