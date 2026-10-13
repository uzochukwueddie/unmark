import type { FileKind, InferenceMode } from './types';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
];
export const IMAGE_EXT = /\.(jpe?g|png|webp|bmp)$/i;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-matroska', // .mkv
  'video/x-msvideo', // .avi
  'video/x-ms-wmv', // .wmv
  'video/3gpp',
  'video/3gpp2',
  'video/ogg',
  'video/mpeg',
];
export const VIDEO_EXT =
  /\.(mp4|m4v|mov|webm|mkv|avi|wmv|3gp|3g2|ogv|ogg|mpg|mpeg)$/i;

export const MAX_BYTES = 300 * 1024 * 1024; // 300 MB — practical browser memory limit (videos are bigger)

export interface ValidationResult {
  ok: boolean;
  kind?: FileKind;
  error?: string;
}

export interface ProcessVideoOptions {
  fps?: number;
  includeAudio?: boolean;
  mimeType?: string;
  inferenceMode?: InferenceMode;
}

export interface ProcessVideoArgs {
  video: HTMLVideoElement;
  maskImageData: ImageData;
  inpaintFn: (imageData: ImageData, maskData: ImageData) => Promise<ImageData>;
  onProgress?: (percent: number, stage: string) => void;
  opts?: ProcessVideoOptions;
}

export type CaptureableCanvas = HTMLCanvasElement & {
  captureStream: (fps?: number) => MediaStream;
};

export type CaptureableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export type VFCVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};
