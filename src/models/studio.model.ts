import type { useStudio } from '../hooks/useStudio';
import type { OutputFormat } from './types';

export type StudioApi = ReturnType<typeof useStudio>;

export const VIDEO_FORMATS: Array<{ value: OutputFormat; label: string }> = [
  { value: 'auto', label: 'Auto (best supported)' },
  { value: 'mp4', label: 'MP4 (H.264)' },
  { value: 'webm', label: 'WebM (VP9)' },
];

export interface StorageStatus {
  used: string;
}
