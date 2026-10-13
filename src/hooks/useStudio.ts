import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from './useToast';
import type {
  Candidate,
  InferenceMode,
  LoadedFile,
  MaskTool,
  ModalMessage,
  ModelStatus,
  OutputFormat,
  ProcessingStatus,
  Quality,
  ReadFileResult,
  VideoInfo,
} from '../models/types';
import { VIDEO_FORMATS, type StorageStatus } from '../models/studio.model';
import { clearModel, isModelCached } from '../lib/model-cache';
import * as inpainter from '../lib/inpainter';
import { formatBytes } from '../lib/upload';
import { dilateMask, MaskCanvas, maskHasContent } from '../lib/mask';
import {
  grabFirstFrame,
  loadVideoMetadata,
  processVideo,
} from '../lib/video/video';

export function useStudio() {
  const toast = useToast();

  // Non-rendering state properties
  const imageDataRef = useRef<ImageData | null>(null);
  const resultDataRef = useRef<ImageData | null>(null);
  const videoInfoRef = useRef<VideoInfo | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);
  const maskRef = useRef<MaskCanvas | null>(null);
  const candidatesRef = useRef<Candidate[]>([]);

  // DOM refs
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoOriginalRef = useRef<HTMLVideoElement | null>(null);
  const videoResultRef = useRef<HTMLVideoElement | null>(null);

  // -- Rendering state --
  const maskExpand = 8;
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [tool, setTool] = useState<MaskTool>('rect');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [quality, setQuality] = useState<Quality>('standard');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp4');
  const [hasCandidates, setHasCandidates] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [hasResult, setHasResult] = useState<boolean>(false);
  const [maskTouched, setMaskTouched] = useState<boolean>(false);
  const [model, setModel] = useState<ModelStatus>({
    ready: false,
    failed: false,
    backend: '—',
    title: 'Looking for the AI model…',
    sub: "Checking your device first — it only downloads if it isn't already here.",
    meta: 'Checking…',
    percent: 0,
    cacheState: 'checking',
  });
  const [storage, setStorage] = useState<StorageStatus>({ used: '—' });
  const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
  const [modal, setModal] = useState<ModalMessage | null>(null);
  const [selectingVideoMask, setSelectingVideoMask] = useState<boolean>(false);
  const [inferenceMode, setInferenceMode] =
    useState<InferenceMode>('first-frame');

  const ZOOM_STEP = 0.25;
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 4;
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomLevelRef = useRef(1);
  const kind = file?.kind ?? null;

  const fitCanvas = useCallback(() => {
    const stage = stageRef.current;
    const canvas = imageCanvasRef.current;
    if (!stage || !canvas) return;

    const info = videoInfoRef.current;
    const naturalWidth =
      info?.width || canvas.width || imageDataRef.current?.width || 1;
    const naturalHeight =
      info?.height || canvas.height || imageDataRef.current?.height || 1;

    if (naturalHeight <= 1 || naturalWidth <= 1) return;

    const styles = getComputedStyle(stage);
    const px = (value: string) => Number.parseFloat(value) || 0;

    const availableHeight =
      stage.clientHeight - px(styles.paddingTop) - px(styles.paddingBottom);
    if (availableHeight <= 0) return;

    const zoom = zoomLevelRef.current;
    const displayHeight = Math.floor(availableHeight * zoom);
    const displayWidth = Math.round(
      displayHeight * (naturalWidth / naturalHeight),
    );

    const w = `${displayWidth}px`;
    const h = `${displayHeight}px`;

    for (const el of [
      imageCanvasRef.current,
      resultCanvasRef.current,
      maskCanvasRef.current,
      videoOriginalRef.current,
      videoResultRef.current,
    ]) {
      if (!el) continue;
      el.style.width = w;
      el.style.height = h;
    }
  }, []);

  const scheduleFit = useCallback(() => {
    requestAnimationFrame(fitCanvas);
  }, [fitCanvas]);

  const refreshStorage = useCallback(async () => {
    let used = 'IndexedDB';
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (estimate) {
        used = `${((estimate.usage || 0) / 1024 / 1024).toFixed(0)} MB local`;
      }
    } catch {
      //
    }
    setStorage({ used });
  }, []);

  useEffect(() => {
    let cancelled = false;

    // IIFE
    (async () => {
      const cached = await isModelCached();
      if (cancelled) return;
      setModel((m) => ({
        ...m,
        cacheState: cached ? 'cached' : 'downloading',
      }));
      refreshStorage();

      try {
        let wasCached = cached;
        await inpainter.init((p) => {
          if (cancelled) return;
          if (p?.cached) wasCached = true;

          const percent =
            p.total > 0
              ? Math.min(100, (p.done / p.total) * 100)
              : p.done > 0
                ? 100
                : 0;
          const size =
            p.total > 0
              ? `${formatBytes(p.done)} / ${formatBytes(p.total)}`
              : p.done > 0
                ? formatBytes(p.done)
                : '';

          setModel((m) => ({
            ...m,
            percent,
            title: wasCached
              ? 'Found it on your device'
              : p.done > 0
                ? 'First-time setup'
                : m.title,
            sub: wasCached
              ? 'Loading the model into the browser…'
              : p.done > 0
                ? "This is the only time you'll see a download. After this it works fully offline."
                : m.sub,
            meta: wasCached
              ? 'Loaded from your device — no download needed'
              : `${p.stage || ''}${size ? ` — ${size}` : ''}`,
          }));
        });

        if (cancelled) return;

        const backend = inpainter.getBackend();
        setModel((m) => ({
          ...m,
          ready: true,
          backend: backend.toUpperCase(),
          percent: 100,
          cacheState: 'cached',
        }));
        refreshStorage();
        toast('AI engine ready.', 'success', 2500);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Bootstrap failed:', e);
        setModel((m) => ({
          ...m,
          failed: true,
          cacheState: 'error',
          title: 'Could not load the AI model',
          sub: msg,
          meta: 'Check your internet connection, then refresh.',
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshStorage, toast]);

  const ensureMask = useCallback(
    (w: number, h: number) => {
      if (!maskRef.current && maskCanvasRef.current) {
        maskRef.current = new MaskCanvas(maskCanvasRef.current);
      }
      maskRef.current?.resize(w, h);
      maskRef.current?.setTool(tool);
      maskRef.current?.setBrushSize(brushSize);
      setMaskTouched(false);
    },
    [tool, brushSize],
  );

  const releaseVideo = useCallback(() => {
    try {
      videoInfoRef.current?.revoke?.();
    } catch {
      //
    }
    videoInfoRef.current = null;
    videoBlobRef.current = null;

    for (const el of [videoResultRef.current, videoOriginalRef.current]) {
      if (!el) continue;
      try {
        el.pause();
      } catch {
        //
      }
      if (el.src?.startsWith('blob:')) {
        URL.revokeObjectURL(el.src);
      }
      el.removeAttribute('src');
      el.load();
    }
  }, []);

  const loadFile = useCallback(
    async ({ file: f, kind: k, error }: ReadFileResult) => {
      if (error || !f || !k) {
        toast(error || 'Could not read this file', 'error');
        return;
      }

      releaseVideo();
      resultDataRef.current = null;
      candidatesRef.current = [];
      setHasCandidates(false);
      setHasResult(false);
      setShowResult(false);
      setSelectingVideoMask(false);

      try {
        let dims: string;

        if (k === 'video') {
          const info = await loadVideoMetadata(f);
          videoInfoRef.current = info;

          const originalVideo = videoOriginalRef.current;
          if (originalVideo) {
            originalVideo.src = URL.createObjectURL(f);
            originalVideo.load();
          }

          const firstFrame = await grabFirstFrame(info.video);
          const canvas = imageCanvasRef.current!;
          canvas.width = info.width;
          canvas.height = info.height;
          canvas.getContext('2d')!.drawImage(firstFrame, 0, 0);
          resultCanvasRef.current!.width = info.width;
          resultCanvasRef.current!.height = info.height;
          imageDataRef.current = canvas
            .getContext('2d')!
            .getImageData(0, 0, info.width, info.height);

          ensureMask(info.width, info.height);
          dims = `${info.width} x ${info.height} · ${info.duration.toFixed(1)}s`;
          setOutputFormat(VIDEO_FORMATS[0].value);
        } else {
          toast('Only video files are supported.', 'error');
          return;
        }

        setFile({ name: f.name, size: formatBytes(f.size), kind: k, dims });
        scheduleFit();

        toast(
          'Video loaded. Mark the watermark on the first frame, then click Remove.',
          'info',
          5000,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Failed to load file:', e);
        toast('Could not load this file: ' + msg, 'error', 6000);
      }
    },
    [scheduleFit, releaseVideo, toast, ensureMask],
  );

  const reset = useCallback(() => {
    releaseVideo();
    imageDataRef.current = null;
    resultDataRef.current = null;
    candidatesRef.current = [];

    if (imageCanvasRef.current) {
      imageCanvasRef.current.width = 1;
      imageCanvasRef.current.height = 1;
    }
    maskRef.current?.resize(1, 1);

    setFile(null);
    setHasResult(false);
    setShowResult(false);
    setHasCandidates(false);
    setMaskTouched(false);
    toast('Ready for a new file.', 'info', 2500);
  }, [releaseVideo, toast]);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.min(
        ZOOM_MAX,
        Math.round((prev + ZOOM_STEP) * 100) / 100,
      );
      zoomLevelRef.current = next;
      requestAnimationFrame(fitCanvas);
      return next;
    });
  }, [fitCanvas]);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(
        ZOOM_MIN,
        Math.round((prev - ZOOM_STEP) * 100) / 100,
      );
      zoomLevelRef.current = next;
      requestAnimationFrame(fitCanvas);
      return next;
    });
  }, [fitCanvas]);

  const zoomReset = useCallback(() => {
    setZoomLevel(1);
    zoomLevelRef.current = 1;
    requestAnimationFrame(fitCanvas);
  }, [fitCanvas]);

  const forgetModel = useCallback(async () => {
    const ok = await clearModel();
    if (ok) {
      toast(
        'Cached model deleted. Refresh the page to download a fresh copy',
        'success',
        5000,
      );
      setModel((m) => ({ ...m, cacheState: 'downloading' }));
      refreshStorage();
    } else {
      toast('Could not delete the cached model.', 'error');
    }
  }, [refreshStorage, toast]);

  const selectTool = useCallback((next: MaskTool) => {
    setTool(next);
    maskRef.current?.setTool(next);
  }, []);

  const changeBrushSize = useCallback((px: number) => {
    setBrushSize(px);
    maskRef.current?.setBrushSize(px);
  }, []);

  const undo = useCallback(() => {
    maskRef.current?.undo();
  }, []);

  const clearMask = useCallback(() => {
    maskRef.current?.clear();
    setMaskTouched(false);
  }, []);

  const selectVideoFrame = useCallback(() => {
    const video = videoOriginalRef.current;
    const canvas = imageCanvasRef.current;

    if (!video || !canvas || video.readyState < 2 || video.seeking) {
      toast('Wait for the video frame to load.', 'info');
      return;
    }

    video.pause();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    imageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setSelectingVideoMask(true);
  }, [toast]);

  const startElapsed = useCallback((expectedSeconds: number) => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      setProcessing((p) =>
        p
          ? {
              ...p,
              stage:
                elapsed < expectedSeconds
                  ? `Running AI inference - ${elapsed.toFixed(0)}s elapsed`
                  : `Still working - ${elapsed.toFixed(0)}s (larger files take longer, hang tight)`,
            }
          : p,
      );
    }, 200);

    return () => clearInterval(id);
  }, []);

  const runVideoRemoval = useCallback(
    async (maskData: ImageData) => {
      const info = videoInfoRef.current;
      if (!info) {
        throw new Error('No video loaded');
      }

      let preferredMime: string | undefined;
      if (outputFormat === 'mp4') {
        preferredMime = 'video/mp4;codecs=avc1,mp4a.40.2';
        if (!MediaRecorder.isTypeSupported(preferredMime)) {
          preferredMime = undefined;
        }
      } else if (outputFormat === 'webm') {
        preferredMime = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(preferredMime)) {
          preferredMime = undefined;
        }
      }

      const t0 = performance.now();
      const blob = await processVideo({
        video: info.video,
        maskImageData: maskData,
        inpaintFn: (frame, mask) => inpainter.inpaint(frame, mask, { quality }),
        onProgress: (pct, stage) =>
          setProcessing((p) => (p ? { ...p, percent: pct, stage } : p)),
        opts: { includeAudio: true, mimeType: preferredMime, inferenceMode },
      });
      const seconds = (performance.now() - t0) / 1000;

      videoBlobRef.current = blob;

      const resultEl = videoResultRef.current!;
      if (resultEl.src?.startsWith('blob:')) {
        URL.revokeObjectURL(resultEl.src);
      }
      resultEl.src = URL.createObjectURL(blob);
      resultEl.load();

      if (info.url && videoOriginalRef.current) {
        videoOriginalRef.current.src = info.url;
        videoOriginalRef.current?.load();
      }

      setHasResult(true);
      setShowResult(true);
      setMaskTouched(false);
      scheduleFit();

      toast(
        `Video processed in ${seconds.toFixed(1)}s. Press play to preview, then Download.`,
        'success',
        5000,
      );
    },
    [outputFormat, quality, inferenceMode, scheduleFit, toast],
  );

  const removeWatermark = useCallback(async () => {
    if (!imageDataRef.current) {
      setModal({
        icon: '🖼',
        title: 'No file loaded',
        message: 'Drop a video first, then try again.',
      });
      return;
    }

    let rawMask: ImageData | null;
    try {
      rawMask = maskRef.current?.getMaskImageData() ?? null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setModal({ icon: '❌', title: 'Could not read the mask', message: msg });
      return;
    }

    if (!rawMask || !maskHasContent(rawMask)) {
      setModal({
        icon: '✏️',
        title: 'Mark the watermark first',
        message:
          'Use the Rectangle tool to drag a box around the watermark — or the Brush to paint over it — then click Remove again.',
      });
      return;
    }

    if (!(await inpainter.isReady())) {
      setModal({
        icon: '⏳',
        title: 'AI model still loading',
        message: 'Give it a few more seconds and try again.',
      });
      return;
    }

    setProcessing({
      title: 'Removing watermark from video',
      sub:
        inferenceMode === 'every-frame'
          ? 'The AI runs on every frame individually — this will take a while.'
          : 'The AI runs once on the first frame, then those clean pixels are painted onto every frame.',
      percent: 15,
      stage: 'Preparing mask',
    });

    let maskData: ImageData;
    try {
      maskData = maskExpand > 0 ? dilateMask(rawMask, maskExpand) : rawMask;
    } catch (error) {
      setProcessing(null);
      const msg = error instanceof Error ? error.message : String(error);
      setModal({ icon: '❌', title: 'Mask preparation failed', message: msg });
      return;
    }

    const base =
      (inpainter.getBackend() === 'webgpu' ? 3 : 20) *
      inpainter.getPassCount(quality);
    const expectedSeconds =
      base + Math.ceil((videoInfoRef.current?.duration ?? 0) * 1.5);
    const stopElapsed = startElapsed(expectedSeconds);

    try {
      await runVideoRemoval(maskData);

      stopElapsed();
      setProcessing({
        title: '✓ Done!',
        sub: 'Click Download in the sidebar to save your file',
        percent: 100,
        stage: '',
      });
      setTimeout(() => setProcessing(null), 1300);
    } catch (error) {
      stopElapsed();
      console.error('[remove] FAILED:', error);
      setProcessing(null);
      const msg = error instanceof Error ? error.message : String(error);
      setModal({
        icon: '❌',
        title: 'Could not remove the watermark',
        message: msg,
      });
    }
  }, [maskExpand, quality, inferenceMode, runVideoRemoval, startElapsed]);

  const download = useCallback(async () => {
    const base = (file?.name || 'output').replace(/\.[^.]+$/, '');

    const blob = videoBlobRef.current;
    if (!blob) {
      toast('Nothing to download - process a file first.', 'warning');
      return;
    }

    const type = (blob.type || '').toLowerCase();
    const ext = type.includes('mp4')
      ? 'mp4'
      : type.includes('webm')
        ? 'webm'
        : 'mp4';

    const filename = `${base}-clean.${ext}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, [file, toast]);

  const toggleCompare = useCallback(() => {
    if (!hasResult) return;
    setShowResult((s) => {
      if (kind === 'video') {
        (s ? videoResultRef.current : videoOriginalRef.current)?.pause();
      }

      return !s;
    });
  }, [hasResult, kind]);

  const resumeVideoPreview = useCallback(
    () => setSelectingVideoMask(false),
    [],
  );

  return {
    stageRef,
    imageCanvasRef,
    resultCanvasRef,
    maskCanvasRef,
    videoOriginalRef,
    videoResultRef,
    file,
    kind,
    tool,
    selectingVideoMask,
    brushSize,
    maskExpand,
    quality,
    outputFormat,
    hasCandidates,
    hasResult,
    showResult,
    maskTouched,
    model,
    storage,
    processing,
    modal,
    formats: VIDEO_FORMATS,
    canRemove: !!file && model.ready && !processing,
    inferenceMode,

    loadFile,
    reset,
    selectVideoFrame,
    resumeVideoPreview,
    selectTool,
    setBrushSize: changeBrushSize,
    setQuality,
    setOutputFormat,
    setMaskTouched,
    setModal,
    undo,
    clearMask,
    removeWatermark,
    download,
    toggleCompare,
    fitCanvas,
    forgetModel,
    zoomLevel,
    zoomIn,
    zoomOut,
    zoomReset,
    setInferenceMode,
  };
}
