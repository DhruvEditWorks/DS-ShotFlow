export type ShotStatus = "TODO" | "READY" | "SHOOTING" | "COMPLETE" | "CUT";

export type WorkspaceView = "shotlist" | "storyboard" | "grid" | "timeline" | "schedule";

export type ColumnKey =
  | "image"
  | "scene"
  | "shot"
  | "description"
  | "subject"
  | "shotSize"
  | "shotType"
  | "movement"
  | "duration"
  | "lens"
  | "fps"
  | "audio"
  | "lighting"
  | "notes"
  | "props"
  | "vfx"
  | "cameraHeight";

export type PresetKind = "shotSize" | "shotType" | "movement" | "cameraHeight" | "framing" | "focus";

export interface ShotColumn {
  key: ColumnKey;
  label: string;
  enabled: boolean;
  optional?: boolean;
  width: number;
  order: number;
}

export interface SceneCard {
  id: string;
  number: string;
  heading: string;
  synopsis?: string;
  scriptText?: string;
  groupId?: string | null;
  color?: string;
  order: number;
  progress: number;
}

export interface SceneGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface Shot {
  id: string;
  sceneId: string;
  sceneNumber: string;
  shotNumber: string;
  description: string;
  subject: string;
  shotSize: string;
  shotType: string;
  movement: string;
  duration: string;
  lens?: string;
  fps?: string;
  audio?: string;
  lighting?: string;
  notes?: string;
  props?: string;
  vfx?: string;
  cameraHeight?: string;
  framing?: string;
  focus?: string;
  imageUrl?: string;
  status: ShotStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface VersionSnapshot {
  id: string;
  label: string;
  createdAt: string;
  payload: ProjectSnapshot;
}

export interface ProjectSnapshot {
  id: string;
  title: string;
  sourceName?: string;
  sourceType?: string;
  scenes: SceneCard[];
  groups: SceneGroup[];
  shots: Shot[];
  columns: ShotColumn[];
  presets: Record<PresetKind, string[]>;
  directorNotes: string;
  cinematographerNotes: string;
  driveFileId?: string;
  versions: VersionSnapshot[];
  updatedAt: string;
}

export interface ParsedScene {
  number: string;
  heading: string;
  scriptText: string;
  synopsis?: string;
}

export interface AIShotSuggestion {
  description: string;
  subject: string;
  shotSize: string;
  shotType: string;
  movement: string;
  duration: string;
  lens?: string;
  lighting?: string;
  notes?: string;
  cameraHeight?: string;
  framing?: string;
  focus?: string;
}

export interface ExportPayload {
  title: string;
  scene?: SceneCard;
  scenes: SceneCard[];
  shots: Shot[];
  format: "pdf" | "csv" | "xlsx" | "json";
}
