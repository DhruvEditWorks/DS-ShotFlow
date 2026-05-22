"use client";

import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useShotflowStore } from "@/stores/use-shotflow-store";

export function SettingsPanel() {
  const open = useShotflowStore((state) => state.columnSettingsOpen);
  const project = useShotflowStore((state) => state.project);
  const setOpen = useShotflowStore((state) => state.setColumnSettingsOpen);
  const toggleColumn = useShotflowStore((state) => state.toggleColumn);
  const reorderColumn = useShotflowStore((state) => state.reorderColumn);
  const columns = project.columns.slice().sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5 text-cinema-red" />
            Shotlist Columns
          </DialogTitle>
          <DialogDescription>Enable, disable, and reorder shot metadata fields for the active table.</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
          {columns.map((column, index) => (
            <div key={column.key} className="flex items-center gap-3 rounded-md border border-white/10 bg-zinc-950 p-2">
              <Checkbox checked={column.enabled} onCheckedChange={() => toggleColumn(column.key)} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{column.label}</div>
                <div className="text-xs text-zinc-500">{column.optional ? "Optional metadata" : "Default StudioBinder-style column"}</div>
              </div>
              <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => reorderColumn(column.key, -1)} title="Move up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={index === columns.length - 1} onClick={() => reorderColumn(column.key, 1)} title="Move down">
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
