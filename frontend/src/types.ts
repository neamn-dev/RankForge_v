// ─── Assets ──────────────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  filename?: string;
  url: string;
  thumbnailUrl?: string | null;
  type: 'video' | 'audio' | 'image';
  size: number;
  extension?: string;
  duration?: number;
  width?: number;
  height?: number;
  createdAt?: string;
}

// ─── Clips ───────────────────────────────────────────────
export interface Clip {
  id: string;
  assetId: string | null;
  name: string;
  url?: string;
  sourceStart: number;
  sourceEnd: number;
  duration: number;
  label: string;
  rank: number;
  color: string;
  description?: string;
  speed?: number;
  transition?: string;
  adjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  narration?: string;
}


// ─── Sandwich Layout ─────────────────────────────────────
export interface TopRegionConfig {
  enabled: boolean;
  height: number;
  backgroundColor: string;
  gradient: string;
  title: string;
  subtitle: string;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  alignment: 'left' | 'center' | 'right';
  padding: number;
  showLogo: boolean;
  animation: 'none' | 'fade' | 'slide-down' | 'typewriter';
}

export interface MainRegionConfig {
  fitMode: 'fit' | 'fill' | 'blur-fill';
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
  showRankBadge: boolean;
  rankBadgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  rankBadgeStyle: 'circle' | 'square' | 'pill' | 'outline';
  padding: number;
}

export interface BottomRegionConfig {
  enabled: boolean;
  height: number;
  backgroundColor: string;
  gradient: string;
  caption: string;
  creatorHandle: string;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  alignment: 'left' | 'center' | 'right';
  padding: number;
  safeSpace: number;
  animation: 'none' | 'fade' | 'slide-up';
}

export interface SandwichLayout {
  preset: string;
  topRegion: TopRegionConfig;
  mainRegion: MainRegionConfig;
  bottomRegion: BottomRegionConfig;
  spacing: number;
  canvasBackground: string;
}

// ─── Templates ───────────────────────────────────────────
export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: string[];
  title: string;
  accent: string;
  rankStyle: string;
  isCustom?: boolean;
  layout?: Partial<SandwichLayout>;
  introStyle?: string;
  outroStyle?: string;
  transitionStyle?: string;
  transitionDuration?: number;
}

// ─── Project ─────────────────────────────────────────────
export interface Project {
  id: string | null;
  name: string;
  title: string;
  hookText: string;
  aspectRatio: string;
  resolution: string;
  fps: number;
  templateId: string;
  clips: Clip[];
  musicAssetId: string | null;
  musicVolume: number;
  titleColor: string;
  accentColor: string;
  layout: SandwichLayout;
  category: string;
  platform: string;
  updatedAt?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt?: string;
}

// ─── Health / Export ─────────────────────────────────────
export interface HealthStatus {
  status: string;
  ffmpegAvailable: boolean;
  ffmpegPath: string | null;
}

export interface ExportResult {
  id: string;
  filename: string;
  url: string;
  size: number;
  durationEstimate: number;
}

// ─── UI ──────────────────────────────────────────────────
export type ToolName =
  | 'Media' | 'Templates' | 'Ranking' | 'Text' | 'Effects'
  | 'Transitions' | 'Audio' | 'Stickers' | 'Layout' | 'Settings';

export type InspectorTab =
  | 'Video' | 'Audio' | 'Speed' | 'Animation' | 'Adjust' | 'Layout';

// ─── Defaults ────────────────────────────────────────────
export const DEFAULT_TOP_REGION: TopRegionConfig = {
  enabled: true,
  height: 12,
  backgroundColor: '#000000',
  gradient: '',
  title: '',
  subtitle: '',
  fontSize: 24,
  fontColor: '#ffffff',
  fontFamily: 'Space Grotesk',
  alignment: 'center',
  padding: 12,
  showLogo: false,
  animation: 'none',
};

export const DEFAULT_MAIN_REGION: MainRegionConfig = {
  fitMode: 'fill',
  cornerRadius: 0,
  borderWidth: 0,
  borderColor: '#ffffff',
  showRankBadge: true,
  rankBadgePosition: 'top-left',
  rankBadgeStyle: 'circle',
  padding: 0,
};

export const DEFAULT_BOTTOM_REGION: BottomRegionConfig = {
  enabled: true,
  height: 12,
  backgroundColor: '#000000',
  gradient: '',
  caption: '',
  creatorHandle: '',
  fontSize: 16,
  fontColor: '#ffffff',
  fontFamily: 'Space Grotesk',
  alignment: 'center',
  padding: 12,
  safeSpace: 0,
  animation: 'none',
};

export const DEFAULT_LAYOUT: SandwichLayout = {
  preset: 'classic-sandwich',
  topRegion: { ...DEFAULT_TOP_REGION },
  mainRegion: { ...DEFAULT_MAIN_REGION },
  bottomRegion: { ...DEFAULT_BOTTOM_REGION },
  spacing: 0,
  canvasBackground: '#000000',
};

export function createDefaultProject(): Project {
  return {
    id: null,
    name: 'Untitled Ranking',
    title: 'Top 5 Moments',
    hookText: 'WAIT FOR NUMBER ONE',
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    templateId: 'classic',
    clips: [],
    musicAssetId: null,
    musicVolume: 0.22,
    titleColor: '#ffffff',
    accentColor: '#22d3ee',
    layout: { ...DEFAULT_LAYOUT },
    category: 'General',
    platform: 'YouTube Shorts',
  };
}

// ─── Helpers ─────────────────────────────────────────────
export const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const fmtBytes = (n: number) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
