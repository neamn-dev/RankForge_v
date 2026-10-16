import React, { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type {
  Asset, Clip, Project, ProjectSummary, Template,
  HealthStatus, ToolName, InspectorTab,
  SandwichLayout, TopRegionConfig, MainRegionConfig, BottomRegionConfig,
} from './types';
import { createDefaultProject, DEFAULT_LAYOUT } from './types';

/* ── State shape ─────────────────────────────────────── */
export interface AppState {
  project: Project;
  past: Project[];
  future: Project[];
  saved: boolean;

  assets: Asset[];
  templates: Template[];
  projects: ProjectSummary[];
  health: HealthStatus | null;

  selectedClipId: string;
  tool: ToolName;
  inspectorTab: InspectorTab;
  playing: boolean;
  playhead: number;
  notice: string;
  busy: string;
  hookOn: boolean;
  exportOpen: boolean;
  projectsOpen: boolean;
  wizardOpen: boolean;
  wizardStep: number;

  trackVideoHidden: boolean;
  trackOverlaysHidden: boolean;
  trackAudioMuted: boolean;
  previewZoom: 'fit' | '50%' | '75%' | '100%';
  previewMuted: boolean;
}

const HISTORY_LIMIT = 50;

function initialState(): AppState {
  return {
    project: createDefaultProject(),
    past: [],
    future: [],
    saved: true,
    assets: [],
    templates: [],
    projects: [],
    health: null,
    selectedClipId: '',
    tool: 'Media',
    inspectorTab: 'Video',
    playing: false,
    playhead: 0,
    notice: '',
    busy: '',
    hookOn: true,
    exportOpen: false,
    projectsOpen: false,
    wizardOpen: true,
    wizardStep: 0,
    trackVideoHidden: false,
    trackOverlaysHidden: false,
    trackAudioMuted: false,
    previewZoom: 'fit',
    previewMuted: false,
  };
}

/* ── Actions ─────────────────────────────────────────── */
export type Action =
  // Project (undoable via COMMIT)
  | { type: 'UPDATE_PROJECT'; payload: Partial<Project> }
  | { type: 'UPDATE_CLIP'; clipId: string; payload: Partial<Clip> }
  | { type: 'ADD_CLIP'; clip: Clip }
  | { type: 'REMOVE_CLIP'; clipId: string }
  | { type: 'MOVE_CLIP'; clipId: string; delta: number }
  | { type: 'SET_LAYOUT'; layout: Partial<SandwichLayout> }
  | { type: 'SET_TOP_REGION'; config: Partial<TopRegionConfig> }
  | { type: 'SET_MAIN_REGION'; config: Partial<MainRegionConfig> }
  | { type: 'SET_BOTTOM_REGION'; config: Partial<BottomRegionConfig> }
  | { type: 'SET_RANKING_LIST'; config: Partial<import('./types').RankingListConfig> }
  | { type: 'SET_WATERMARK'; config: Partial<import('./types').WatermarkConfig> }
  | { type: 'APPLY_TEMPLATE'; template: Template }
  // Lifecycle
  | { type: 'LOAD_PROJECT'; project: Project }
  | { type: 'NEW_PROJECT' }
  | { type: 'MARK_SAVED' }
  // History
  | { type: 'COMMIT' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Data
  | { type: 'SET_ASSETS'; assets: Asset[] }
  | { type: 'ADD_ASSETS'; assets: Asset[] }
  | { type: 'REMOVE_ASSET'; assetId: string }
  | { type: 'SET_TEMPLATES'; templates: Template[] }
  | { type: 'SET_PROJECTS'; projects: ProjectSummary[] }
  | { type: 'SET_HEALTH'; health: HealthStatus }
  // Ranking & Clips
  | { type: 'REORDER_CLIPS'; clipIds: string[] }
  | { type: 'RENUMBER_RANKS'; mode: 'countdown' | 'standard' }
  // UI
  | { type: 'SET_TOOL'; tool: ToolName }
  | { type: 'SET_INSPECTOR_TAB'; tab: InspectorTab }
  | { type: 'SET_SELECTED'; clipId: string }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_PLAYHEAD'; time: number }
  | { type: 'SET_NOTICE'; message: string }
  | { type: 'SET_BUSY'; message: string }
  | { type: 'SET_HOOK_ON'; on: boolean }
  | { type: 'SET_EXPORT_OPEN'; open: boolean }
  | { type: 'SET_PROJECTS_OPEN'; open: boolean }
  | { type: 'SET_WIZARD_OPEN'; open: boolean }
  | { type: 'SET_WIZARD_STEP'; step: number }
  | { type: 'TOGGLE_TRACK_VIDEO_HIDDEN' }
  | { type: 'TOGGLE_TRACK_OVERLAYS_HIDDEN' }
  | { type: 'TOGGLE_TRACK_AUDIO_MUTED' }
  | { type: 'SET_PREVIEW_ZOOM'; zoom: 'fit' | '50%' | '75%' | '100%' }
  | { type: 'TOGGLE_PREVIEW_MUTED' };

/* ── Reducer ─────────────────────────────────────────── */
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ── Project mutations ──
    case 'UPDATE_PROJECT':
      return { ...state, project: { ...state.project, ...action.payload }, saved: false };

    case 'UPDATE_CLIP':
      return {
        ...state,
        project: {
          ...state.project,
          clips: state.project.clips.map(c =>
            c.id === action.clipId ? { ...c, ...action.payload } : c
          ),
        },
        saved: false,
      };

    case 'ADD_CLIP':
      return {
        ...state,
        project: { ...state.project, clips: [...state.project.clips, action.clip] },
        selectedClipId: action.clip.id,
        saved: false,
      };

    case 'REMOVE_CLIP': {
      const clips = state.project.clips.filter(c => c.id !== action.clipId);
      return {
        ...state,
        project: {
          ...state.project,
          clips: clips.map((c, i) => ({ ...c, rank: clips.length - i })),
        },
        selectedClipId: clips[0]?.id || '',
        saved: false,
      };
    }

    case 'MOVE_CLIP': {
      const arr = [...state.project.clips];
      const i = arr.findIndex(c => c.id === action.clipId);
      const j = i + action.delta;
      if (i < 0 || j < 0 || j >= arr.length) return state;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return {
        ...state,
        project: { ...state.project, clips: arr.map((c, k) => ({ ...c, rank: arr.length - k })) },
        saved: false,
      };
    }

    case 'SET_LAYOUT':
      return {
        ...state,
        project: {
          ...state.project,
          layout: { ...state.project.layout, ...action.layout },
        },
        saved: false,
      };

    case 'SET_TOP_REGION':
      return {
        ...state,
        project: {
          ...state.project,
          layout: {
            ...state.project.layout,
            topRegion: { ...state.project.layout.topRegion, ...action.config },
          },
        },
        saved: false,
      };

    case 'SET_MAIN_REGION':
      return {
        ...state,
        project: {
          ...state.project,
          layout: {
            ...state.project.layout,
            mainRegion: { ...state.project.layout.mainRegion, ...action.config },
          },
        },
        saved: false,
      };

    case 'SET_BOTTOM_REGION':
      return {
        ...state,
        project: {
          ...state.project,
          layout: {
            ...state.project.layout,
            bottomRegion: { ...state.project.layout.bottomRegion, ...action.config },
          },
        },
        saved: false,
      };

    case 'SET_RANKING_LIST':
      return {
        ...state,
        project: {
          ...state.project,
          layout: {
            ...state.project.layout,
            rankingList: {
              ...(state.project.layout.rankingList || {}),
              ...action.config,
            },
          },
        },
        saved: false,
      };

    case 'SET_WATERMARK':
      return {
        ...state,
        project: {
          ...state.project,
          layout: {
            ...state.project.layout,
            watermark: {
              ...(state.project.layout.watermark || {}),
              ...action.config,
            },
          },
        },
        saved: false,
      };

    case 'APPLY_TEMPLATE': {
      const t = action.template;
      const layoutOverrides = t.layout || {};
      return {
        ...state,
        project: {
          ...state.project,
          templateId: t.id,
          title: t.title,
          accentColor: t.accent,
          titleColor: t.colors[0] || '#ffffff',
          layout: {
            ...state.project.layout,
            ...layoutOverrides,
            topRegion: {
              ...state.project.layout.topRegion,
              ...(layoutOverrides.topRegion || {}),
            },
            mainRegion: {
              ...state.project.layout.mainRegion,
              ...(layoutOverrides.mainRegion || {}),
            },
            bottomRegion: {
              ...state.project.layout.bottomRegion,
              ...(layoutOverrides.bottomRegion || {}),
            },
            rankingList: {
              ...state.project.layout.rankingList,
              ...(layoutOverrides.rankingList || {}),
            },
            watermark: {
              ...state.project.layout.watermark,
              ...(layoutOverrides.watermark || {}),
            },
          },
        },
        tool: 'Ranking',
        saved: false,
      };
    }

    // ── Lifecycle ──
    case 'LOAD_PROJECT': {
      const p = action.project;
      const baseLayout = { ...DEFAULT_LAYOUT };
      const rawLayout = p.layout || {};
      const layout = {
        ...baseLayout,
        ...rawLayout,
        topRegion: { ...baseLayout.topRegion, ...(rawLayout.topRegion || {}) },
        mainRegion: { ...baseLayout.mainRegion, ...(rawLayout.mainRegion || {}) },
        bottomRegion: { ...baseLayout.bottomRegion, ...(rawLayout.bottomRegion || {}) },
        rankingList: { ...baseLayout.rankingList, ...(rawLayout.rankingList || {}) },
        watermark: { ...baseLayout.watermark, ...(rawLayout.watermark || {}) },
      };
      return {
        ...state,
        project: { ...createDefaultProject(), ...p, layout },
        past: [],
        future: [],
        saved: true,
        selectedClipId: p.clips?.[0]?.id || '',
        wizardOpen: false,
      };
    }

    case 'NEW_PROJECT':
      return {
        ...state,
        project: createDefaultProject(),
        past: [],
        future: [],
        saved: false,
        selectedClipId: '',
        wizardOpen: true,
        wizardStep: 0,
      };

    case 'MARK_SAVED':
      return { ...state, saved: true };

    // ── History ──
    case 'COMMIT':
      return {
        ...state,
        past: [...state.past.slice(-HISTORY_LIMIT), state.project],
        future: [],
      };

    case 'UNDO': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        project: prev,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future],
        saved: false,
      };
    }

    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...state,
        project: next,
        past: [...state.past, state.project],
        future: state.future.slice(1),
        saved: false,
      };
    }

    // ── Data ──
    case 'SET_ASSETS': {
      const videoAssets = action.assets.filter(a => a.type === 'video');
      const audioAssets = action.assets.filter(a => a.type === 'audio');
      const updatedClips = state.project.clips.map((c, idx) => {
        if (!c.assetId && videoAssets.length > 0) {
          const matched = videoAssets.find(v => v.name.toLowerCase().includes(c.name.toLowerCase().replace('.mp4', '')))
            || videoAssets[idx % videoAssets.length];
          if (matched) {
            return {
              ...c,
              assetId: matched.id,
              url: matched.url,
            };
          }
        }
        return c;
      });
      const musicId = state.project.musicAssetId || audioAssets[0]?.id || null;
      return {
        ...state,
        assets: action.assets,
        project: {
          ...state.project,
          clips: updatedClips,
          musicAssetId: musicId,
        },
      };
    }
    case 'ADD_ASSETS': return { ...state, assets: [...state.assets, ...action.assets] };
    case 'REMOVE_ASSET':
      return {
        ...state,
        assets: state.assets.filter(a => a.id !== action.assetId),
        project: {
          ...state.project,
          musicAssetId: state.project.musicAssetId === action.assetId ? null : state.project.musicAssetId,
          clips: state.project.clips.map(c => c.assetId === action.assetId ? { ...c, assetId: null, url: undefined } : c),
        },
      };
    case 'SET_TEMPLATES': return { ...state, templates: action.templates };
    case 'SET_PROJECTS': return { ...state, projects: action.projects };
    case 'SET_HEALTH': return { ...state, health: action.health };

    // ── Ranking & Clips ──
    case 'REORDER_CLIPS': {
      const map = new Map(state.project.clips.map(c => [c.id, c]));
      const ordered = action.clipIds.map(id => map.get(id)).filter(Boolean) as Clip[];
      return {
        ...state,
        project: {
          ...state.project,
          clips: ordered.map((c, i) => ({ ...c, rank: ordered.length - i })),
        },
        saved: false,
      };
    }

    case 'RENUMBER_RANKS': {
      const count = state.project.clips.length;
      return {
        ...state,
        project: {
          ...state.project,
          clips: state.project.clips.map((c, i) => ({
            ...c,
            rank: action.mode === 'countdown' ? count - i : i + 1,
          })),
        },
        saved: false,
      };
    }

    // ── UI ──
    case 'SET_TOOL': return { ...state, tool: action.tool };
    case 'SET_INSPECTOR_TAB': return { ...state, inspectorTab: action.tab };
    case 'SET_SELECTED': return { ...state, selectedClipId: action.clipId };
    case 'SET_PLAYING': return { ...state, playing: action.playing };
    case 'SET_PLAYHEAD': return { ...state, playhead: action.time };
    case 'SET_NOTICE': return { ...state, notice: action.message };
    case 'SET_BUSY': return { ...state, busy: action.message };
    case 'SET_HOOK_ON': return { ...state, hookOn: action.on };
    case 'SET_EXPORT_OPEN': return { ...state, exportOpen: action.open };
    case 'SET_PROJECTS_OPEN': return { ...state, projectsOpen: action.open };
    case 'SET_WIZARD_OPEN': return { ...state, wizardOpen: action.open };
    case 'SET_WIZARD_STEP': return { ...state, wizardStep: action.step };
    case 'TOGGLE_TRACK_VIDEO_HIDDEN': return { ...state, trackVideoHidden: !state.trackVideoHidden };
    case 'TOGGLE_TRACK_OVERLAYS_HIDDEN': return { ...state, trackOverlaysHidden: !state.trackOverlaysHidden };
    case 'TOGGLE_TRACK_AUDIO_MUTED': return { ...state, trackAudioMuted: !state.trackAudioMuted };
    case 'SET_PREVIEW_ZOOM': return { ...state, previewZoom: action.zoom };
    case 'TOGGLE_PREVIEW_MUTED': return { ...state, previewMuted: !state.previewMuted };

    default:
      return state;
  }
}

/* ── Context ─────────────────────────────────────────── */
const StoreCtx = createContext<{ state: AppState; dispatch: Dispatch<Action> }>(null!);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/* ── Derived helpers ─────────────────────────────────── */
export function useSelectedClip() {
  const { state } = useStore();
  return state.project.clips.find(c => c.id === state.selectedClipId) || state.project.clips[0] || null;
}

export function useTotalDuration(hookOn: boolean) {
  const { state } = useStore();
  return state.project.clips.reduce((n, c) => n + c.duration, 0) + (hookOn ? 1.8 : 0);
}

export function useCurrentTemplate() {
  const { state } = useStore();
  return state.templates.find(t => t.id === state.project.templateId) || state.templates[0] || null;
}
