import type { ColumnKey, PresetKind, ShotColumn, ShotStatus } from "@/types/shotflow";

export const SHOT_SIZE_OPTIONS = ["CU", "MCU", "ECU", "WCU", "MS", "CS", "MCS", "WS", "EWS", "FS", "MFS", "LS", "ELS"];

export const CAMERA_HEIGHT_OPTIONS = [
  "Eye Level",
  "Low Angle",
  "High Angle",
  "Overhead",
  "Shoulder Level",
  "Hip Level",
  "Knee Level",
  "Ground Level"
];

export const FRAMING_OPTIONS = ["Single", "Two Shot", "Three Shot", "OTS", "POV"];

export const FOCUS_OPTIONS = ["Rack Focus", "Shallow Focus", "Deep Focus", "Tilt Shift", "Zoom"];

export const SHOT_TYPE_OPTIONS = [...CAMERA_HEIGHT_OPTIONS, ...FRAMING_OPTIONS, ...FOCUS_OPTIONS];

export const MOVEMENT_OPTIONS = [
  "Static",
  "Pan",
  "Tilt",
  "Swish Pan",
  "Swish Tilt",
  "Tracking",
  "Dolly",
  "Push In",
  "Pull Out",
  "Crane",
  "Handheld",
  "Steadicam",
  "Orbit"
];

export const STATUS_OPTIONS: { value: ShotStatus; label: string }[] = [
  { value: "TODO", label: "Todo" },
  { value: "READY", label: "Ready" },
  { value: "SHOOTING", label: "Shooting" },
  { value: "COMPLETE", label: "Complete" },
  { value: "CUT", label: "Cut" }
];

export const GROUP_COLORS = ["#d71920", "#ffffff", "#8b949e", "#f97316", "#eab308", "#22c55e", "#38bdf8", "#a855f7"];

export const DEFAULT_COLUMNS: ShotColumn[] = [
  { key: "image", label: "Image", enabled: true, width: 112, order: 0 },
  { key: "scene", label: "Scene", enabled: true, width: 84, order: 1 },
  { key: "shot", label: "Shot", enabled: true, width: 84, order: 2 },
  { key: "description", label: "Description", enabled: true, width: 280, order: 3 },
  { key: "subject", label: "Subject", enabled: true, width: 180, order: 4 },
  { key: "shotSize", label: "Shot Size", enabled: true, width: 140, order: 5 },
  { key: "shotType", label: "Shot Type", enabled: true, width: 170, order: 6 },
  { key: "movement", label: "Movement", enabled: true, width: 160, order: 7 },
  { key: "duration", label: "Duration", enabled: true, width: 120, order: 8 },
  { key: "lens", label: "Lens", enabled: false, optional: true, width: 120, order: 9 },
  { key: "fps", label: "FPS", enabled: false, optional: true, width: 96, order: 10 },
  { key: "audio", label: "Audio", enabled: false, optional: true, width: 180, order: 11 },
  { key: "lighting", label: "Lighting", enabled: false, optional: true, width: 180, order: 12 },
  { key: "notes", label: "Notes", enabled: false, optional: true, width: 240, order: 13 },
  { key: "props", label: "Props", enabled: false, optional: true, width: 180, order: 14 },
  { key: "vfx", label: "VFX", enabled: false, optional: true, width: 160, order: 15 },
  { key: "cameraHeight", label: "Camera Height", enabled: false, optional: true, width: 160, order: 16 }
];

export const EMPTY_PRESETS: Record<PresetKind, string[]> = {
  shotSize: [],
  shotType: [],
  movement: [],
  cameraHeight: [],
  framing: [],
  focus: []
};

export const COLUMN_LABELS: Record<ColumnKey, string> = DEFAULT_COLUMNS.reduce(
  (acc, column) => ({ ...acc, [column.key]: column.label }),
  {} as Record<ColumnKey, string>
);
