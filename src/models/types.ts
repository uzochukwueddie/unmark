export type FileKind = 'image' | 'video';

export type RemovalMode = 'watermark' | 'object';

export type Quality = 'standard' | 'high';

export type InferenceMode = 'first-frame' | 'every-frame';

export type MaskTool = 'brush' | 'rect';

export type DetectRegion =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

export type OutputFormat = 'png' | 'jpg' | 'webp' | 'auto' | 'mp4' | 'webm';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Candidate extends Box {
  score: number;
  region: string;
  profile?: string;
  source?: 'preset' | 'detected';
  corroborated?: boolean;
  rank?: number;
}

export interface LoadedFile {
  name: string;
  size: string;
  kind: FileKind;
  dims: string;
}

export interface ModelStatus {
  ready: boolean;
  failed: boolean;
  backend: string;
  title: string;
  sub: string;
  meta: string;
  percent: number;
  cacheState: 'checking' | 'cached' | 'downloading' | 'error';
}

export interface ProcessingStatus {
  title: string;
  sub: string;
  percent: number;
  stage: string;
}

export interface ModalMessage {
  icon: string;
  title: string;
  message: string;
}

export interface ReadFileResult {
  file?: File;
  kind?: FileKind;
  image?: HTMLImageElement;
  error?: string;
}

export interface VideoInfo {
  video: HTMLVideoElement;
  url: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  revoke: () => void;
}

export interface DownloadProgress {
  done: number;
  total: number;
  cached?: boolean;
  stage?: string;
}

export interface Point {
  x: number;
  y: number;
}
