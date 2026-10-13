import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { MaskTool } from './types';
import type { RadioOption } from '../components/ui';

export const FORMATS = ['MP4', 'WEBM', 'MOV', 'MKV'];

export const QUALITY_OPTIONS = [
  {
    value: 'standard',
    label: 'Standard',
    title: 'One AI pass over anything that could not be recovered.',
  },
  {
    value: 'high',
    label: 'High (2 passes)',
    title:
      'A second refinement pass over the same area. Roughly twice as slow.',
  },
];

export const QUALITY_HINTS: Record<string, string> = {
  standard: 'One AI pass. Only used where recovery was not mpossible.',
  high: 'Two AI passes over the un-recoverable part. Roughly twice as slow.',
};

export const INFERENCE_MODE_OPTIONS: RadioOption[] = [
  {
    value: 'first-frame',
    label: 'First frame only (fast)',
    title:
      'AI runs once on frame 1. Those clean pixels are stamped onto every frame. Best for static backgrounds.',
  },
  {
    value: 'every-frame',
    label: 'Every frame (thorough)',
    title:
      'AI runs independently on each frame. Handles moving backgrounds but is much slower.',
  },
];

export const INFERENCE_MODE_HINTS: Record<string, string> = {
  'first-frame':
    'Fast. Best for fixed watermarks on a non-changing background.',
  'every-frame':
    'Slow — one AI call per frame. Use when the background under the watermark changes across frames.',
};

export const TOOLS: Array<{
  value: MaskTool;
  icon: string;
  title: string;
  label: string;
}> = [
  {
    value: 'rect',
    icon: '▭',
    label: 'Rect',
    title: 'Rectangle (R) — drag to refine',
  },
  { value: 'brush', icon: '✏', label: 'Brush', title: 'Brush (B)' },
];

export interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
}

export interface EngineStatus {
  kind: 'ready' | 'busy' | 'error';
  label: string;
}
