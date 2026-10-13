import type { VideoInfo } from '../../models/types';
import type { ProcessVideoArgs } from '../../models/video.model';
import {
  buildOutputMediaStream,
  buildPatchCanvas,
  createRecorder,
  decodeFirstFrame,
  drawFirstOutputFrame,
  finalizeRecording,
  playAndRecord,
  processEveryFrame,
} from './video-utils';

const PREFERRED_FPS = 30;

export async function loadVideoMetadata(file: File): Promise<VideoInfo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    video.addEventListener(
      'error',
      () => reject(new Error('Could not decode video')),
      { once: true },
    );
  });

  return {
    video,
    url,
    width: video.videoWidth,
    height: video.videoHeight,
    duration: video.duration,
    fps: PREFERRED_FPS,
    revoke: () => URL.revokeObjectURL(url),
  };
}

export async function grabFirstFrame(
  video: HTMLVideoElement,
): Promise<HTMLCanvasElement> {
  if (video.readyState < 2) {
    await new Promise<void>((resolve) =>
      video.addEventListener('loadeddata', () => resolve(), { once: true }),
    );
  }
  video.currentTime = 0;
  await new Promise<void>((resolve) =>
    video.addEventListener('seeked', () => resolve(), { once: true }),
  );

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  return canvas;
}

export async function processVideo({
  video,
  maskImageData,
  inpaintFn,
  onProgress,
  opts = {},
}: ProcessVideoArgs): Promise<Blob> {
  const inferenceMode = opts.inferenceMode ?? 'first-frame';

  if (inferenceMode === 'every-frame') {
    return processVideoEveryFrame({
      video,
      maskImageData,
      inpaintFn,
      onProgress,
      opts,
    });
  }

  return processVideoFirstFrame({
    video,
    maskImageData,
    inpaintFn,
    onProgress,
    opts,
  });
}

async function processVideoFirstFrame({
  video,
  maskImageData,
  inpaintFn,
  onProgress,
  opts = {},
}: ProcessVideoArgs): Promise<Blob> {
  const fps = opts.fps || PREFERRED_FPS;
  const width = video.videoWidth;
  const height = video.videoHeight;
  const duration = video.duration;
  const t0 = performance.now();

  // ==== Step 1: AI on first frame ====
  const firstFrameImageData = await decodeFirstFrame(video, width, height);

  onProgress?.(5, 'Running AI on reference frame (one-time)');
  const aiStart = performance.now();
  const inpaintedFirstFrame = await inpaintFn(
    firstFrameImageData,
    maskImageData,
  );
  console.log(
    `[video] First-frame AI done in ${((performance.now() - aiStart) / 1000).toFixed(1)}s`,
  );
  // ==== End ===

  // ==== Step 2: Build canvas ====
  onProgress?.(12, 'Preparing batch');
  const patchCanvas = buildPatchCanvas(inpaintedFirstFrame, maskImageData, 6);

  // ==== Step 3: Set up output canvas ====
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputCtx = outputCanvas.getContext('2d')!;

  const mediaStream = buildOutputMediaStream(outputCanvas, video, fps, opts);
  const { recorder, chunks, recordingDone, mimeType } = createRecorder(
    mediaStream,
    opts,
  );
  // ==== End ====

  // ==== Step 4: Play video and capture ====
  onProgress?.(15, 'Recording - playing through video');
  await drawFirstOutputFrame(
    video,
    outputCtx,
    patchCanvas,
    width,
    height,
    opts,
  );

  recorder.start();
  await playAndRecord(
    video,
    outputCtx,
    patchCanvas,
    width,
    height,
    duration,
    onProgress,
  );

  // === End ===

  // ==== Step 5: Finalize ====
  onProgress?.(99, 'Encoding final frames');
  await finalizeRecording(recorder, recordingDone, video);

  const totalSec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `[video] Total time: ${totalSec}s (${duration.toFixed(1)}s video)`,
  );
  // ==== End ====

  onProgress?.(100, `Done in ${totalSec}s`);

  return new Blob(chunks, { type: mimeType });
}

async function processVideoEveryFrame({
  video,
  maskImageData,
  inpaintFn,
  onProgress,
  opts = {},
}: ProcessVideoArgs): Promise<Blob> {
  const fps = opts.fps || PREFERRED_FPS;
  const width = video.videoWidth;
  const height = video.videoHeight;
  const duration = video.duration;
  const t0 = performance.now();

  // Step 1
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d')!;

  onProgress?.(5, 'Starting per-frame AI removal…');

  // Step 2
  const { recorder, chunks, recordingDone, mimeType } = await processEveryFrame(
    video,
    maskImageData,
    inpaintFn,
    outCtx,
    outCanvas,
    width,
    height,
    duration,
    fps,
    opts,
    onProgress,
  );
  // ==== End ====

  // Step 3
  onProgress?.(99, 'Encoding final frames');
  await finalizeRecording(recorder, recordingDone, video);

  const totalSec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `[video] Every-frame mode — total time: ${totalSec}s (${duration.toFixed(1)}s video)`,
  );
  // ==== End ====

  onProgress?.(100, `Done in ${totalSec}s`);

  return new Blob(chunks, { type: mimeType });
}
