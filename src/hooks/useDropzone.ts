import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from 'react';
import type { ReadFileResult } from '../models/types';
import { readFile } from '../lib/upload';

export function useDropzone(onFile: (result: ReadFileResult) => void) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);

  const handlerRef = useRef(onFile);
  useEffect(() => {
    handlerRef.current = onFile;
  }, [onFile]);

  const accept = useCallback((file: File) => {
    if (!file) return;

    handlerRef.current(readFile(file));
  }, []);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) accept(file);

      event.target.value = '';
    },
    [accept],
  );

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    const onWindowDrop = (e: globalThis.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) accept(file);
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', onWindowDrop);

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', onWindowDrop);
    };
  }, [accept]);

  const dropzoneProps = {
    ref: zoneRef,
    onClick: (event: MouseEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('button')) return;
      openPicker();
    },
    onDragEnter: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (zoneRef.current?.contains(event.relatedTarget as Node)) return;
      setIsDragging(false);
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) accept(file);
    },
  };

  const inputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept: 'video/*',
    hidden: true,
    onChange: onInputChange,
  };

  return {
    isDragging,
    dropzoneProps,
    inputProps,
    openPicker,
  };
}
