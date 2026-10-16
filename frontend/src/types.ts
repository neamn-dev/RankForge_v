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
  rankColor?: string;
  comment?: string;
  emoji?: string;
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

export interface TitleWord {
  text: string;
  color: string;
}

// ─── Viral Candidates (Discovery) ─────────────────────────
export interface ViralCandidate {
  id: string;
  rank: number;
  title: string;
  description: string;
  comment?: string;
  emoji?: string;
  rankColor?: string;
  duration: number;
  sourceUrl?: string | null;
  thumbnailUrl?: string | null;
  views?: number;
  viewsFormatted?: string;
  likes?: number;
  likesFormatted?: string;
  creator?: string;
  originalCredits?: string;
  viralScore?: number;
  license?: string;
  localAssetId?: string | null;
}

export interface DiscoverResponse {
  topic: string;
  hookText: string;
  templateId: string;
  accentColor: string;
  platform: string;
  candidates: ViralCandidate[];
}

export interface AssembleProjectRequest {
  topic: string;
  hookText: string;
  platform: string;
  aspectRatio: string;
  templateId: string;
  canvasBackground: string;
  candidates: ViralCandidate[];
  downloadClips?: boolean;
}

// ─── Sandwich Layout ─────────────────────────────────────
export interface TopRegionConfig {
  enabled: boolean;
  mode?: 'overlay' | 'banner' | 'glass';
  height: number;
  backgroundColor: string;
  gradient: string;
  title: string;
  subtitle: string;
  titleWords?: TitleWord[];
  strokeWidth?: number;
  strokeColor?: string;
  shadowStyle?: 'none' | 'subtle' | '3d-heavy' | 'glow';
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

export interface RankingListConfig {
  enabled: boolean;
  position: 'left' | 'right';
  xOffset: number;
  yOffset: number;
  fontSize: number;
  spacing: number;
  style3D: boolean;
  highlightActive: boolean;
  showAllRanks: boolean;
  displayMode: 'number-only' | 'with-comment' | 'full';
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  position: 'bottom-center' | 'bottom-right' | 'bottom-left';
  opacity: number;
}

export interface SandwichLayout {
  preset: string;
  topRegion: TopRegionConfig;
  mainRegion: MainRegionConfig;
  bottomRegion: BottomRegionConfig;
  rankingList: RankingListConfig;
  watermark: WatermarkConfig;
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
  mode: 'overlay',
  height: 14,
  backgroundColor: '#000000',
  gradient: '',
  title: 'Ranking Funniest Trampoline Moments',
  subtitle: '',
  titleWords: [
    { text: 'Ranking', color: '#ffffff' },
    { text: 'Funniest', color: '#facc15' },
    { text: 'Trampoline', color: '#38bdf8' },
    { text: 'Moments', color: '#ffffff' },
  ],
  strokeWidth: 4,
  strokeColor: '#000000',
  shadowStyle: '3d-heavy',
  fontSize: 28,
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
  showRankBadge: false,
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

export const DEFAULT_RANKING_LIST: RankingListConfig = {
  enabled: true,
  position: 'left',
  xOffset: 5,
  yOffset: 26,
  fontSize: 26,
  spacing: 8,
  style3D: true,
  highlightActive: true,
  showAllRanks: true,
  displayMode: 'full',
};

export const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: false,
  text: 'xiroranks',
  position: 'bottom-center',
  opacity: 0.8,
};

export const DEFAULT_LAYOUT: SandwichLayout = {
  preset: 'classic-sandwich',
  topRegion: { ...DEFAULT_TOP_REGION },
  mainRegion: { ...DEFAULT_MAIN_REGION },
  bottomRegion: { ...DEFAULT_BOTTOM_REGION },
  rankingList: { ...DEFAULT_RANKING_LIST },
  watermark: { ...DEFAULT_WATERMARK },
  spacing: 0,
  canvasBackground: '#000000',
};

export function createDefaultProject(): Project {
  return {
    id: null,
    name: 'Ranking Funniest Trampoline Moments',
    title: 'Ranking Funniest Trampoline Moments',
    hookText: 'WAIT FOR NUMBER ONE 💀',
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    templateId: 'trampoline',
    clips: [
      {
        id: 'clip-def-1',
        assetId: null,
        name: 'Super Trampoline Record.mp4',
        duration: 4.0,
        sourceStart: 0,
        sourceEnd: 4.0,
        label: 'Super Trampoline Record',
        rank: 1,
        rankColor: '#facc15',
        color: '#facc15',
        speed: 1.0,
        comment: '',
        emoji: '🔥',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      },
      {
        id: 'clip-def-2',
        assetId: null,
        name: 'Wall Run Flip.mp4',
        duration: 3.8,
        sourceStart: 0,
        sourceEnd: 3.8,
        label: 'Wall Run Flip',
        rank: 2,
        rankColor: '#38bdf8',
        color: '#38bdf8',
        speed: 1.0,
        comment: '',
        emoji: '',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      },
      {
        id: 'clip-def-3',
        assetId: null,
        name: 'Roof Trampoline Drop.mp4',
        duration: 3.5,
        sourceStart: 0,
        sourceEnd: 3.5,
        label: 'Roof Trampoline Drop',
        rank: 3,
        rankColor: '#ef4444',
        color: '#ef4444',
        speed: 1.0,
        comment: '',
        emoji: '',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      },
      {
        id: 'clip-def-4',
        assetId: null,
        name: 'Synchronized Bounce.mp4',
        duration: 3.5,
        sourceStart: 0,
        sourceEnd: 3.5,
        label: 'Synchronized Bounce',
        rank: 4,
        rankColor: '#ffffff',
        color: '#ffffff',
        speed: 1.0,
        comment: '',
        emoji: '',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      },
      {
        id: 'clip-def-5',
        assetId: null,
        name: 'Triple Flip Fail.mp4',
        duration: 3.5,
        sourceStart: 0,
        sourceEnd: 3.5,
        label: 'Triple Flip Fail',
        rank: 5,
        rankColor: '#ffffff',
        color: '#ffffff',
        speed: 1.0,
        comment: '',
        emoji: '',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      },
      {
        id: 'clip-def-6',
        assetId: null,
        name: 'Direct Hit Outer Spring.mp4',
        duration: 4.2,
        sourceStart: 0,
        sourceEnd: 4.2,
        label: 'Direct Hit Outer Spring',
        rank: 6,
        rankColor: '#ffffff',
        color: '#ffffff',
        speed: 1.0,
        comment: 'Direct hit',
        emoji: '💀',
        adjustments: { brightness: 100, contrast: 100, saturation: 100 },
      },
    ],
    musicAssetId: null,
    musicVolume: 0.22,
    titleColor: '#ffffff',
    accentColor: '#facc15',
    layout: { ...DEFAULT_LAYOUT },
    category: 'Sports',
    platform: 'YouTube Shorts',
  };
}

// ─── Helpers ─────────────────────────────────────────────
export const fmtTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const fmtBytes = (n: number) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
