import type { ReadFileResult } from '../models/types';
import {
  ALLOWED_VIDEO_TYPES,
  MAX_BYTES,
  VIDEO_EXT,
  type ValidationResult,
} from '../models/video.model';

export function readFile(file: File): ReadFileResult {
  const result = validateFile(file);
  if (!result.ok) return { error: result.error };

  if (result.kind === 'video') {
    return { file, kind: result.kind };
  }

  return {
    error: 'Unsupported format. Use MP4, WEBM, MOV, MKV, or AVI videos.',
  };
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function validateFile(file: File | null | undefined): ValidationResult {
  if (!file) return { ok: false, error: 'No file selected' };

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is ${MAX_BYTES / 1024 / 1024} MB.`,
    };
  }

  const isVideoMime =
    ALLOWED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/');
  const isVideoExt = VIDEO_EXT.test(file.name);
  if (isVideoMime || isVideoExt) return { ok: true, kind: 'video' };

  return {
    ok: false,
    error: 'Unsupported format. Use MP4, WEBM, MOV, MKV, or AVI videos.',
  };
}
