import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatRelativeSave(date?: string | Date | null) {
  if (!date) return "Not saved yet";
  const time = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const delta = Math.max(0, Date.now() - time);
  if (delta < 10_000) return "Saved just now";
  if (delta < 60_000) return `Saved ${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `Saved ${Math.floor(delta / 60_000)}m ago`;
  return `Saved ${new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
