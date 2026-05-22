"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_COLUMNS, EMPTY_PRESETS } from "@/lib/shotflow-constants";
import { parsePlainScreenplay, sceneShotSeed } from "@/lib/screenplay-parser";
import { uid } from "@/lib/utils";
import type {
  AIShotSuggestion,
  ColumnKey,
  ParsedScene,
  PresetKind,
  ProjectSnapshot,
  SceneCard,
  SceneGroup,
  Shot,
  ShotColumn,
  ShotStatus,
  WorkspaceView
} from "@/types/shotflow";

interface ShotflowState {
  project: ProjectSnapshot;
  selectedSceneId: string;
  activeShotId?: string;
  selectedShotIds: string[];
  copiedShots: Shot[];
  search: string;
  filterStatus: "ALL" | ShotStatus;
  view: WorkspaceView;
  columnSettingsOpen: boolean;
  saveStatus: "idle" | "saving" | "saved" | "offline" | "error";
  lastSavedAt?: string;
  importScript: (source: string, sourceName?: string, sourceType?: string) => void;
  importParsedScenes: (scenes: ParsedScene[], sourceName?: string, sourceType?: string) => void;
  selectScene: (sceneId: string) => void;
  setActiveShot: (shotId?: string) => void;
  addGroup: () => void;
  updateGroup: (groupId: string, patch: Partial<SceneGroup>) => void;
  moveSceneToGroup: (sceneId: string, groupId?: string | null) => void;
  reorderScene: (sceneId: string, targetSceneId: string) => void;
  addShot: (sceneId?: string, patch?: Partial<Shot>) => void;
  updateShot: (shotId: string, patch: Partial<Shot>) => void;
  duplicateShot: (shotId: string) => void;
  deleteShots: (shotIds?: string[]) => void;
  toggleShotSelection: (shotId: string, additive?: boolean) => void;
  selectShotRange: (shotId: string) => void;
  copySelectedShots: () => void;
  pasteShots: (sceneId?: string) => void;
  reorderShot: (shotId: string, targetShotId: string) => void;
  setShotImage: (shotId: string, imageUrl: string) => void;
  toggleColumn: (key: ColumnKey) => void;
  reorderColumn: (key: ColumnKey, direction: -1 | 1) => void;
  setView: (view: WorkspaceView) => void;
  setSearch: (search: string) => void;
  setFilterStatus: (status: "ALL" | ShotStatus) => void;
  setColumnSettingsOpen: (open: boolean) => void;
  saveCustomPreset: (kind: PresetKind, value: string) => void;
  applyAIShots: (sceneId: string, suggestions: AIShotSuggestion[]) => void;
  updateProjectNotes: (patch: Pick<Partial<ProjectSnapshot>, "directorNotes" | "cinematographerNotes" | "title">) => void;
  markSaving: () => void;
  markSaved: () => void;
  markOffline: () => void;
  createVersion: (label?: string) => void;
  replaceProject: (project: ProjectSnapshot) => void;
  setDriveFileId: (driveFileId: string) => void;
}

function now() {
  return new Date().toISOString();
}

function createInitialProject(): ProjectSnapshot {
  const scenes: ParsedScene[] = parsePlainScreenplay(`INT. ABANDONED THEATER - NIGHT

Rain clicks against the cracked marquee. DARA steps through the aisle with a flashlight, finding red tape marks on the stage.

EXT. ROOFTOP - DAWN

The crew watches the city ignite in sunrise. A drone hums above them as the first shot is called.

INT. EDIT SUITE - LATER

Monitors glow in a dark room. The director and cinematographer argue over a single frame.`);

  const groups: SceneGroup[] = [
    { id: "grp_prelight", name: "Pre-light Priority", color: "#d71920", collapsed: false, order: 0 },
    { id: "grp_company", name: "Company Move", color: "#8b949e", collapsed: false, order: 1 }
  ];

  const sceneCards: SceneCard[] = scenes.map((scene, index) => ({
    id: `scene_${index + 1}`,
    number: scene.number,
    heading: scene.heading,
    synopsis: scene.synopsis,
    scriptText: scene.scriptText,
    groupId: index === 0 ? "grp_prelight" : index === 1 ? "grp_company" : null,
    order: index,
    progress: index === 1 ? 30 : 0
  }));

  const shots = sceneCards.flatMap((scene, index) =>
    sceneShotSeed(
      {
        number: scene.number,
        heading: scene.heading,
        scriptText: scene.scriptText || "",
        synopsis: scene.synopsis
      },
      scene.id
    ).map((shot) => ({ ...shot, order: shot.order + index * 10 }))
  );

  return {
    id: uid("project"),
    title: "DS ShotFlow Demo",
    sourceName: "demo.fountain",
    sourceType: "fountain",
    scenes: sceneCards,
    groups,
    shots,
    columns: DEFAULT_COLUMNS,
    presets: EMPTY_PRESETS,
    directorNotes: "Keep the visual language precise: red marks, negative fill, restrained motion until the reveal.",
    cinematographerNotes: "Favor hard practical edges and deep blacks. Use soft toplight only for performance closeups.",
    versions: [],
    updatedAt: now()
  };
}

function renumberShots(shots: Shot[], scenes: SceneCard[]) {
  return shots
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((shot) => {
      const scene = scenes.find((item) => item.id === shot.sceneId);
      const sceneShots = shots.filter((item) => item.sceneId === shot.sceneId).sort((a, b) => a.order - b.order);
      const index = sceneShots.findIndex((item) => item.id === shot.id);
      const suffix = String.fromCharCode(65 + Math.max(0, index));
      return {
        ...shot,
        sceneNumber: scene?.number ?? shot.sceneNumber,
        shotNumber: `${scene?.number ?? shot.sceneNumber}${suffix}`,
        updatedAt: now()
      };
    });
}

function progressForScene(shots: Shot[], sceneId: string) {
  const sceneShots = shots.filter((shot) => shot.sceneId === sceneId);
  if (sceneShots.length === 0) return 0;
  const complete = sceneShots.filter((shot) => shot.status === "COMPLETE" || shot.status === "CUT").length;
  return Math.round((complete / sceneShots.length) * 100);
}

function touch(project: ProjectSnapshot): ProjectSnapshot {
  const updated = now();
  const scenes = project.scenes.map((scene) => ({
    ...scene,
    progress: progressForScene(project.shots, scene.id)
  }));
  return {
    ...project,
    scenes,
    shots: renumberShots(project.shots, scenes),
    updatedAt: updated
  };
}

function moveById<T extends { id: string; order: number }>(items: T[], itemId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((item, index) => ({ ...item, order: index }));
}

export const useShotflowStore = create<ShotflowState>()(
  persist(
    (set, get) => ({
      project: createInitialProject(),
      selectedSceneId: "scene_1",
      activeShotId: "scene_1_shot_master",
      selectedShotIds: [],
      copiedShots: [],
      search: "",
      filterStatus: "ALL",
      view: "shotlist",
      columnSettingsOpen: false,
      saveStatus: "idle",
      importScript: (source, sourceName = "Imported script", sourceType = "txt") => {
        get().importParsedScenes(parsePlainScreenplay(source), sourceName, sourceType);
      },
      importParsedScenes: (parsedScenes, sourceName = "Imported script", sourceType = "script") => {
        const scenes = parsedScenes.map<SceneCard>((scene, index) => ({
          id: uid("scene"),
          number: scene.number || String(index + 1),
          heading: scene.heading || `SCENE ${index + 1}`,
          synopsis: scene.synopsis,
          scriptText: scene.scriptText,
          groupId: null,
          order: index,
          progress: 0
        }));
        const shots = scenes.flatMap((scene, index) =>
          sceneShotSeed(
            {
              number: scene.number,
              heading: scene.heading,
              scriptText: scene.scriptText || "",
              synopsis: scene.synopsis
            },
            scene.id
          ).map((shot) => ({ ...shot, order: shot.order + index * 10 }))
        );
        set((state) => ({
          project: touch({
            ...state.project,
            sourceName,
            sourceType,
            scenes,
            shots,
            groups: [],
            versions: [
              ...state.project.versions,
              {
                id: uid("version"),
                label: "Before import",
                createdAt: now(),
                payload: state.project
              }
            ].slice(-12)
          }),
          selectedSceneId: scenes[0]?.id ?? "",
          activeShotId: shots[0]?.id,
          selectedShotIds: [],
          saveStatus: "saving"
        }));
      },
      selectScene: (sceneId) => {
        const firstShot = get()
          .project.shots.filter((shot) => shot.sceneId === sceneId)
          .sort((a, b) => a.order - b.order)[0];
        set({ selectedSceneId: sceneId, activeShotId: firstShot?.id, selectedShotIds: [] });
      },
      setActiveShot: (shotId) => set({ activeShotId: shotId }),
      addGroup: () =>
        set((state) => ({
          project: touch({
            ...state.project,
            groups: [
              ...state.project.groups,
              {
                id: uid("group"),
                name: `New Group ${state.project.groups.length + 1}`,
                color: "#d71920",
                collapsed: false,
                order: state.project.groups.length
              }
            ]
          }),
          saveStatus: "saving"
        })),
      updateGroup: (groupId, patch) =>
        set((state) => ({
          project: touch({
            ...state.project,
            groups: state.project.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group))
          }),
          saveStatus: "saving"
        })),
      moveSceneToGroup: (sceneId, groupId = null) =>
        set((state) => ({
          project: touch({
            ...state.project,
            scenes: state.project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, groupId } : scene))
          }),
          saveStatus: "saving"
        })),
      reorderScene: (sceneId, targetSceneId) =>
        set((state) => ({
          project: touch({
            ...state.project,
            scenes: moveById(state.project.scenes, sceneId, targetSceneId)
          }),
          saveStatus: "saving"
        })),
      addShot: (sceneId = get().selectedSceneId, patch = {}) =>
        set((state) => {
          const scene = state.project.scenes.find((item) => item.id === sceneId) || state.project.scenes[0];
          if (!scene) return state;
          const sceneShots = state.project.shots.filter((shot) => shot.sceneId === scene.id);
          const createdAt = now();
          const shot: Shot = {
            id: uid("shot"),
            sceneId: scene.id,
            sceneNumber: scene.number,
            shotNumber: `${scene.number}${String.fromCharCode(65 + sceneShots.length)}`,
            description: "",
            subject: "",
            shotSize: "MS",
            shotType: "Single",
            movement: "Static",
            duration: "00:05",
            status: "TODO",
            order: Math.max(-1, ...state.project.shots.map((item) => item.order)) + 1,
            createdAt,
            updatedAt: createdAt,
            ...patch
          };
          return {
            project: touch({ ...state.project, shots: [...state.project.shots, shot] }),
            activeShotId: shot.id,
            selectedShotIds: [shot.id],
            saveStatus: "saving"
          };
        }),
      updateShot: (shotId, patch) =>
        set((state) => ({
          project: touch({
            ...state.project,
            shots: state.project.shots.map((shot) => (shot.id === shotId ? { ...shot, ...patch, updatedAt: now() } : shot))
          }),
          saveStatus: "saving"
        })),
      duplicateShot: (shotId) =>
        set((state) => {
          const source = state.project.shots.find((shot) => shot.id === shotId);
          if (!source) return state;
          const duplicate: Shot = {
            ...source,
            id: uid("shot"),
            shotNumber: `${source.shotNumber}-DUP`,
            order: source.order + 0.5,
            createdAt: now(),
            updatedAt: now()
          };
          return {
            project: touch({ ...state.project, shots: [...state.project.shots, duplicate].sort((a, b) => a.order - b.order).map((shot, index) => ({ ...shot, order: index })) }),
            activeShotId: duplicate.id,
            selectedShotIds: [duplicate.id],
            saveStatus: "saving"
          };
        }),
      deleteShots: (shotIds) =>
        set((state) => {
          const ids = shotIds?.length ? shotIds : state.selectedShotIds.length ? state.selectedShotIds : state.activeShotId ? [state.activeShotId] : [];
          const nextShots = state.project.shots.filter((shot) => !ids.includes(shot.id));
          return {
            project: touch({ ...state.project, shots: nextShots }),
            activeShotId: nextShots.find((shot) => shot.sceneId === state.selectedSceneId)?.id,
            selectedShotIds: [],
            saveStatus: "saving"
          };
        }),
      toggleShotSelection: (shotId, additive = false) =>
        set((state) => {
          if (!additive) return { selectedShotIds: [shotId], activeShotId: shotId };
          const selected = state.selectedShotIds.includes(shotId)
            ? state.selectedShotIds.filter((id) => id !== shotId)
            : [...state.selectedShotIds, shotId];
          return { selectedShotIds: selected, activeShotId: shotId };
        }),
      selectShotRange: (shotId) =>
        set((state) => {
          const sceneShots = state.project.shots.filter((shot) => shot.sceneId === state.selectedSceneId).sort((a, b) => a.order - b.order);
          const activeIndex = sceneShots.findIndex((shot) => shot.id === state.activeShotId);
          const targetIndex = sceneShots.findIndex((shot) => shot.id === shotId);
          if (activeIndex < 0 || targetIndex < 0) return { selectedShotIds: [shotId], activeShotId: shotId };
          const [from, to] = [Math.min(activeIndex, targetIndex), Math.max(activeIndex, targetIndex)];
          return { selectedShotIds: sceneShots.slice(from, to + 1).map((shot) => shot.id), activeShotId: shotId };
        }),
      copySelectedShots: () =>
        set((state) => ({
          copiedShots: state.project.shots.filter((shot) => state.selectedShotIds.includes(shot.id))
        })),
      pasteShots: (sceneId = get().selectedSceneId) =>
        set((state) => {
          const scene = state.project.scenes.find((item) => item.id === sceneId);
          if (!scene || state.copiedShots.length === 0) return state;
          const maxOrder = Math.max(-1, ...state.project.shots.map((shot) => shot.order));
          const copies = state.copiedShots.map((shot, index) => ({
            ...shot,
            id: uid("shot"),
            sceneId: scene.id,
            sceneNumber: scene.number,
            order: maxOrder + index + 1,
            createdAt: now(),
            updatedAt: now()
          }));
          return {
            project: touch({ ...state.project, shots: [...state.project.shots, ...copies] }),
            activeShotId: copies[0]?.id,
            selectedShotIds: copies.map((shot) => shot.id),
            saveStatus: "saving"
          };
        }),
      reorderShot: (shotId, targetShotId) =>
        set((state) => ({
          project: touch({
            ...state.project,
            shots: moveById([...state.project.shots].sort((a, b) => a.order - b.order), shotId, targetShotId)
          }),
          saveStatus: "saving"
        })),
      setShotImage: (shotId, imageUrl) => get().updateShot(shotId, { imageUrl }),
      toggleColumn: (key) =>
        set((state) => ({
          project: touch({
            ...state.project,
            columns: state.project.columns.map((column) => (column.key === key ? { ...column, enabled: !column.enabled } : column))
          }),
          saveStatus: "saving"
        })),
      reorderColumn: (key, direction) =>
        set((state) => {
          const columns = [...state.project.columns].sort((a, b) => a.order - b.order);
          const index = columns.findIndex((column) => column.key === key);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= columns.length) return state;
          [columns[index], columns[target]] = [columns[target], columns[index]];
          return {
            project: touch({ ...state.project, columns: columns.map((column, order) => ({ ...column, order })) }),
            saveStatus: "saving"
          };
        }),
      setView: (view) => set({ view }),
      setSearch: (search) => set({ search }),
      setFilterStatus: (filterStatus) => set({ filterStatus }),
      setColumnSettingsOpen: (columnSettingsOpen) => set({ columnSettingsOpen }),
      saveCustomPreset: (kind, value) =>
        set((state) => {
          const trimmed = value.trim();
          if (!trimmed) return state;
          const presets = state.project.presets[kind].includes(trimmed)
            ? state.project.presets
            : { ...state.project.presets, [kind]: [...state.project.presets[kind], trimmed] };
          return { project: touch({ ...state.project, presets }), saveStatus: "saving" };
        }),
      applyAIShots: (sceneId, suggestions) =>
        set((state) => {
          const scene = state.project.scenes.find((item) => item.id === sceneId);
          if (!scene) return state;
          const maxOrder = Math.max(-1, ...state.project.shots.map((shot) => shot.order));
          const createdAt = now();
          const aiShots: Shot[] = suggestions.map((suggestion, index) => ({
            id: uid("shot"),
            sceneId,
            sceneNumber: scene.number,
            shotNumber: `${scene.number}${String.fromCharCode(65 + index)}`,
            description: suggestion.description,
            subject: suggestion.subject,
            shotSize: suggestion.shotSize,
            shotType: suggestion.shotType,
            movement: suggestion.movement,
            duration: suggestion.duration,
            lens: suggestion.lens,
            lighting: suggestion.lighting,
            notes: suggestion.notes,
            cameraHeight: suggestion.cameraHeight,
            framing: suggestion.framing,
            focus: suggestion.focus,
            status: "TODO",
            order: maxOrder + index + 1,
            createdAt,
            updatedAt: createdAt
          }));
          return {
            project: touch({ ...state.project, shots: [...state.project.shots, ...aiShots] }),
            activeShotId: aiShots[0]?.id,
            selectedShotIds: aiShots.map((shot) => shot.id),
            saveStatus: "saving"
          };
        }),
      updateProjectNotes: (patch) =>
        set((state) => ({
          project: touch({ ...state.project, ...patch }),
          saveStatus: "saving"
        })),
      markSaving: () => set({ saveStatus: "saving" }),
      markSaved: () => set({ saveStatus: "saved", lastSavedAt: now() }),
      markOffline: () => set({ saveStatus: "offline" }),
      createVersion: (label = "Manual checkpoint") =>
        set((state) => ({
          project: {
            ...state.project,
            versions: [
              ...state.project.versions,
              {
                id: uid("version"),
                label,
                createdAt: now(),
                payload: {
                  ...state.project,
                  versions: []
                }
              }
            ].slice(-25)
          }
        })),
      replaceProject: (project) =>
        set({
          project,
          selectedSceneId: project.scenes[0]?.id ?? "",
          activeShotId: project.shots[0]?.id,
          selectedShotIds: [],
          saveStatus: "saved",
          lastSavedAt: now()
        }),
      setDriveFileId: (driveFileId) =>
        set((state) => ({
          project: touch({ ...state.project, driveFileId }),
          saveStatus: "saved",
          lastSavedAt: now()
        }))
    }),
    {
      name: "ds-shotflow-workspace",
      partialize: (state) => ({
        project: state.project,
        selectedSceneId: state.selectedSceneId,
        activeShotId: state.activeShotId,
        selectedShotIds: state.selectedShotIds,
        search: state.search,
        filterStatus: state.filterStatus,
        view: state.view
      })
    }
  )
);

export function selectVisibleColumns(columns: ShotColumn[]) {
  return columns.filter((column) => column.enabled).sort((a, b) => a.order - b.order);
}
