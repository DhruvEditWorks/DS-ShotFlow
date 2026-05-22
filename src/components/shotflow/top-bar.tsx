"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Cloud,
  Download,
  FileUp,
  PanelRightOpen,
  Plus,
  Printer,
  Save,
  Settings2,
  Sparkles
} from "lucide-react";
import { AuthButton } from "@/components/shotflow/auth-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { downloadBlob, formatRelativeSave } from "@/lib/utils";
import { useShotflowStore } from "@/stores/use-shotflow-store";
import type { ExportPayload } from "@/types/shotflow";

export function TopBar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const project = useShotflowStore((state) => state.project);
  const selectedSceneId = useShotflowStore((state) => state.selectedSceneId);
  const saveStatus = useShotflowStore((state) => state.saveStatus);
  const lastSavedAt = useShotflowStore((state) => state.lastSavedAt);
  const importScript = useShotflowStore((state) => state.importScript);
  const importParsedScenes = useShotflowStore((state) => state.importParsedScenes);
  const addShot = useShotflowStore((state) => state.addShot);
  const applyAIShots = useShotflowStore((state) => state.applyAIShots);
  const setColumnSettingsOpen = useShotflowStore((state) => state.setColumnSettingsOpen);
  const updateProjectNotes = useShotflowStore((state) => state.updateProjectNotes);
  const markSaving = useShotflowStore((state) => state.markSaving);
  const markSaved = useShotflowStore((state) => state.markSaved);
  const markOffline = useShotflowStore((state) => state.markOffline);
  const createVersion = useShotflowStore((state) => state.createVersion);
  const replaceProject = useShotflowStore((state) => state.replaceProject);
  const setDriveFileId = useShotflowStore((state) => state.setDriveFileId);

  const selectedScene = project.scenes.find((scene) => scene.id === selectedSceneId);

  async function importFile(file?: File) {
    if (!file) return;
    setBusy("Importing");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Import failed");
      const data = (await response.json()) as {
        sourceName: string;
        sourceType: string;
        scenes: Parameters<typeof importParsedScenes>[0];
      };
      importParsedScenes(data.scenes, data.sourceName, data.sourceType);
    } catch {
      const text = await file.text().catch(() => "");
      if (text) importScript(text, file.name, file.name.split(".").pop());
      markOffline();
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function exportProject(format: ExportPayload["format"]) {
    setBusy(`Exporting ${format.toUpperCase()}`);
    try {
      const payload: ExportPayload = {
        title: project.title,
        scene: selectedScene,
        scenes: selectedScene ? [selectedScene] : project.scenes,
        shots: selectedScene ? project.shots.filter((shot) => shot.sceneId === selectedScene.id) : project.shots,
        format
      };
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      downloadBlob(blob, `${project.title.replace(/[^a-z0-9]+/gi, "-")}.${format}`);
    } finally {
      setBusy(null);
    }
  }

  async function generateAI() {
    if (!selectedScene) return;
    setBusy("Generating AI shots");
    try {
      const response = await fetch("/api/ai-shotlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene: selectedScene })
      });
      if (!response.ok) throw new Error("AI generation failed");
      const data = await response.json();
      applyAIShots(selectedScene.id, data.shots);
    } finally {
      setBusy(null);
    }
  }

  async function saveNow() {
    markSaving();
    try {
      await fetch(`/api/projects/${project.id}/autosave`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project })
      });
      markSaved();
    } catch {
      markOffline();
    }
  }

  async function saveToDrive() {
    setBusy("Syncing Drive");
    const supabase = createSupabaseBrowserClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const accessToken = session?.provider_token;
    try {
      const response = await fetch("/api/drive/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, accessToken })
      });
      if (!response.ok) throw new Error("Drive sync failed");
      const data = (await response.json()) as { file?: { id?: string } };
      if (data.file?.id) setDriveFileId(data.file.id);
      markSaved();
    } catch {
      markOffline();
    } finally {
      setBusy(null);
    }
  }

  async function loadFromDrive() {
    const fileId = window.prompt("Google Drive file id");
    if (!fileId) return;
    setBusy("Loading Drive");
    const supabase = createSupabaseBrowserClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    const accessToken = session?.provider_token;
    try {
      const response = await fetch("/api/drive/load", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken, fileId })
      });
      if (!response.ok) throw new Error("Drive load failed");
      const data = await response.json();
      replaceProject({ ...data.project, driveFileId: fileId });
    } catch {
      markOffline();
    } finally {
      setBusy(null);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/[0.65] px-4 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cinema-red/50 bg-cinema-red/[0.15]">
          <Sparkles className="h-4 w-4 text-cinema-ember" />
        </div>
        <Input
          value={project.title}
          onChange={(event) => updateProjectNotes({ title: event.target.value })}
          className="h-9 w-[min(40vw,420px)] border-0 bg-transparent px-0 text-lg font-semibold text-white shadow-none focus-visible:ring-0"
          aria-label="Project title"
        />
        <div className="hidden items-center gap-2 text-xs text-zinc-500 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-cinema-red" />
          {saveStatus === "saving" ? "Saving..." : saveStatus === "offline" ? "Offline local save" : formatRelativeSave(lastSavedAt)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".fdx,.pdf,.fountain,.txt,text/plain,application/pdf"
          className="hidden"
          onChange={(event) => importFile(event.target.files?.[0])}
        />
        <Button variant="metal" size="sm" onClick={() => fileRef.current?.click()}>
          <FileUp className="h-4 w-4" />
          Import
        </Button>
        <Button variant="metal" size="sm" onClick={() => addShot()}>
          <Plus className="h-4 w-4" />
          Shot
        </Button>
        <Button variant="default" size="sm" onClick={generateAI} disabled={!selectedScene || Boolean(busy)}>
          <Bot className="h-4 w-4" />
          Generate AI Shotlist
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="metal" size="icon" title="Export">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportProject("pdf")}>Cinematic PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportProject("csv")}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportProject("xlsx")}>Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportProject("json")}>JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="metal" size="icon" onClick={() => window.print()} title="Print">
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="metal" size="icon" onClick={() => setColumnSettingsOpen(true)} title="Columns">
          <Settings2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="metal" size="icon" title="Save">
              <Save className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={saveNow}>
              <Save className="h-4 w-4" />
              Save now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => createVersion()}>
              <PanelRightOpen className="h-4 w-4" />
              Version checkpoint
            </DropdownMenuItem>
            <DropdownMenuItem onClick={saveToDrive}>
              <Cloud className="h-4 w-4" />
              Save to Drive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={saveToDrive}>
              <Cloud className="h-4 w-4" />
              Sync Drive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={loadFromDrive}>
              <Cloud className="h-4 w-4" />
              Load from Drive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AuthButton />
      </div>
      <AnimatePresence>
        {busy ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md border border-cinema-red/40 bg-black px-3 py-1 text-xs text-red-100 shadow-glow"
          >
            {busy}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
