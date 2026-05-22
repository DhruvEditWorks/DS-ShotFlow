"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Clapperboard, Columns3, Film, Grid3X3, LayoutDashboard } from "lucide-react";
import { AdvancedWorkspaceView } from "@/components/shotflow/workspace-views";
import { LeftSidebar } from "@/components/shotflow/left-sidebar";
import { RightInspector } from "@/components/shotflow/right-inspector";
import { SettingsPanel } from "@/components/shotflow/settings-panel";
import { ShotTable } from "@/components/shotflow/shot-table";
import { TopBar } from "@/components/shotflow/top-bar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useShotflowStore } from "@/stores/use-shotflow-store";
import type { WorkspaceView } from "@/types/shotflow";

const VIEWS: { value: WorkspaceView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "shotlist", label: "Shotlist", icon: Columns3 },
  { value: "storyboard", label: "Storyboard", icon: Film },
  { value: "grid", label: "Grid", icon: Grid3X3 },
  { value: "timeline", label: "Timeline", icon: Clapperboard },
  { value: "schedule", label: "Schedule", icon: CalendarDays }
];

function ViewRail() {
  const view = useShotflowStore((state) => state.view);
  const setView = useShotflowStore((state) => state.setView);

  return (
    <TooltipProvider>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/50 px-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
          <LayoutDashboard className="h-4 w-4 text-cinema-red" />
          Workspace
        </div>
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-zinc-950 p-1">
          {VIEWS.map((item) => {
            const Icon = item.icon;
            const active = view === item.value;
            return (
              <Tooltip key={item.value}>
                <TooltipTrigger asChild>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={cn("h-8 px-3", active && "shadow-none")}
                    onClick={() => setView(item.value)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden 2xl:inline">{item.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DSShotFlowApp() {
  const project = useShotflowStore((state) => state.project);
  const saveStatus = useShotflowStore((state) => state.saveStatus);
  const view = useShotflowStore((state) => state.view);
  const markSaved = useShotflowStore((state) => state.markSaved);
  const markOffline = useShotflowStore((state) => state.markOffline);
  const copySelectedShots = useShotflowStore((state) => state.copySelectedShots);
  const pasteShots = useShotflowStore((state) => state.pasteShots);
  const deleteShots = useShotflowStore((state) => state.deleteShots);
  const duplicateShot = useShotflowStore((state) => state.duplicateShot);
  const activeShotId = useShotflowStore((state) => state.activeShotId);
  const createVersion = useShotflowStore((state) => state.createVersion);

  useEffect(() => {
    if (saveStatus !== "saving") return;
    const timeout = window.setTimeout(async () => {
      if (!navigator.onLine) {
        markOffline();
        return;
      }
      try {
        const response = await fetch(`/api/projects/${project.id}/autosave`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project })
        });
        if (!response.ok) throw new Error("Autosave failed");
        markSaved();
      } catch {
        markOffline();
      }
    }, Number(process.env.NEXT_PUBLIC_AUTOSAVE_INTERVAL_MS || 3500));

    return () => window.clearTimeout(timeout);
  }, [markOffline, markSaved, project, saveStatus]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isEditing) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelectedShots();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteShots();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && activeShotId) {
        event.preventDefault();
        duplicateShot(activeShotId);
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        createVersion("Keyboard checkpoint");
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteShots();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeShotId, copySelectedShots, createVersion, deleteShots, duplicateShot, pasteShots]);

  return (
    <div className="shotflow-grid flex h-screen w-screen flex-col overflow-hidden bg-cinema-black text-zinc-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <section className="relative flex min-w-0 flex-1 flex-col">
          <ViewRail />
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="relative flex min-h-0 flex-1"
            >
              {view === "shotlist" ? <ShotTable /> : <AdvancedWorkspaceView />}
            </motion.div>
          </AnimatePresence>
        </section>
        <RightInspector />
      </div>
      <SettingsPanel />
    </div>
  );
}
