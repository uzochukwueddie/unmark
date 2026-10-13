import type {
  CaptureableCanvas,
  CaptureableVideo,
  ProcessVideoArgs,
  VFCVideo,
} from '../../models/video.model';

export async function decodeFirstFrame(
  video: HTMLVideoElement,
  width: number,
  height: number,
): Promise<ImageData> {
  video.muted = true;
  video.currentTime = 0;
  await waitForSeeked(video);

  const refCanvas = document.createElement('canvas');
  refCanvas.width = width;
  refCanvas.height = height;

  const refCtx = refCanvas.getContext('2d', { willReadFrequently: true })!;
  refCtx.drawImage(video, 0, 0);
  return refCtx.getImageData(0, 0, width, height);
}

/**
 * This function extracts the masked region from an inpainted image
 * and returns it as a canvas with feathered (blurred) edges, ready
 * to be composited back over an original image.
 */
export function buildPatchCanvas(
  inpaintedImage: ImageData,
  maskImage: ImageData,
  featherRadius = 6,
): OffscreenCanvas {
  const { width: w, height: h } = inpaintedImage;
  const patch = new ImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    const a = maskImage.data[i * 4 + 3];

    if (a > 16) {
      // Get RGBA (Red, Green, Blue, Alpha)
      patch.data[i * 4 + 0] = inpaintedImage.data[i * 4 + 0]; // copy R from inpainted image
      patch.data[i * 4 + 1] = inpaintedImage.data[i * 4 + 1]; // copy G from inpainted image
      patch.data[i * 4 + 2] = inpaintedImage.data[i * 4 + 2]; // copy B from inpainted image
      patch.data[i * 4 + 3] = a; // keep original alpha
    }
  }

  const baseCanvas = new OffscreenCanvas(w, h);
  const baseCtx = baseCanvas.getContext(
    '2d',
  ) as OffscreenCanvasRenderingContext2D;
  baseCtx.putImageData(patch, 0, 0);

  const featherCanvas = new OffscreenCanvas(w, h);
  const featherCtx = featherCanvas.getContext(
    '2d',
  ) as OffscreenCanvasRenderingContext2D;
  featherCtx.putImageData(patch, 0, 0);

  featherCtx.filter = `blur(${featherRadius}px)`;
  featherCtx.drawImage(baseCanvas, 0, 0);

  featherCtx.filter = 'none';

  return featherCanvas;
}

export function buildOutputMediaStream(
  outputCanvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  fps: number,
  opts: ProcessVideoArgs['opts'],
): MediaStream {
  const canvasStream = (outputCanvas as CaptureableCanvas).captureStream(fps);

  const videoTrack = canvasStream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error('captureStream returned no video track');
  }

  const mediaStream = new MediaStream();

  mediaStream.addTrack(videoTrack);

  const audioTrack =
    opts?.includeAudio !== false ? tryCaptureAudioTrack(video) : null;
  if (audioTrack) {
    mediaStream.addTrack(audioTrack);
  }

  return mediaStream;
}

export async function drawFirstOutputFrame(
  video: HTMLVideoElement,
  outCtx: CanvasRenderingContext2D,
  patchCanvas: OffscreenCanvas,
  width: number,
  height: number,
  opts: ProcessVideoArgs['opts'],
): Promise<void> {
  video.currentTime = 0;
  video.muted = opts?.includeAudio === false;

  // Draw the first frame before starting recorder
  await waitForSeeked(video);
  outCtx.drawImage(video, 0, 0, width, height);
  outCtx.drawImage(patchCanvas, 0, 0);
}

export async function finalizeRecording(
  recorder: MediaRecorder,
  recordingDone: Promise<void>,
  video: HTMLVideoElement,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  recorder.stop();
  await recordingDone;
  video.pause();
}

export function createRecorder(
  mediaStream: MediaStream,
  opts: ProcessVideoArgs['opts'],
): {
  recorder: MediaRecorder;
  chunks: Blob[];
  recordingDone: Promise<void>;
  mimeType: string;
} {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2', // MP4 (H.264 video + AAC audio) — best compatibility, but not all browsers support recording to it
    'video/webm;codecs=vp9,opus', // WebM with VP9 video + Opus audio — good quality/compression, widely supported
    'video/webm;codecs=vp8,opus', // WebM with VP8 + Opus — older/more broadly supported fallback
    'video/webm', // generic WebM, let the browser pick its own default codecs
  ];

  const mimeType =
    opts?.mimeType || candidates.find((m) => MediaRecorder.isTypeSupported(m));

  if (!mimeType) {
    throw new Error('No supported MediaRecorder mime type');
  }

  const recorder = new MediaRecorder(mediaStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000, // target ~5 Mbps video bitrate
  });

  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingDone = new Promise<void>(
    (resolve) => (recorder.onstop = () => resolve()),
  );

  return {
    recorder,
    chunks,
    recordingDone,
    mimeType,
  };
}

export function playAndRecord(
  video: HTMLVideoElement,
  outCtx: CanvasRenderingContext2D,
  patchCanvas: OffscreenCanvas,
  width: number,
  height: number,
  duration: number,
  onProgress: ProcessVideoArgs['onProgress'],
): Promise<void> {
  const vfcVideo = video as VFCVideo;

  const useVFC = typeof vfcVideo.requestVideoFrameCallback === 'function';

  return new Promise((resolve, reject) => {
    let frameCount = 0;
    let lastReportedPct = 15;
    const playStart = performance.now();

    function onFrame() {
      outCtx.drawImage(video, 0, 0, width, height);

      outCtx.drawImage(patchCanvas, 0, 0);

      frameCount++;

      const elapsed = (performance.now() - playStart) / 1000;

      const progress = Math.min(98, 15 + (video.currentTime / duration) * 83);

      if (progress - lastReportedPct >= 1) {
        const realtimeFps = frameCount / Math.max(0.1, elapsed);

        onProgress?.(
          progress,
          `Recording ${video.currentTime.toFixed(1)}s / ${duration.toFixed(1)}s · ${realtimeFps.toFixed(0)} fps`,
        );

        lastReportedPct = progress;
      }

      if (useVFC && !video.ended) {
        vfcVideo.requestVideoFrameCallback!(onFrame);
      }
    }

    video.addEventListener('ended', () => resolve(), { once: true });

    video.addEventListener(
      'error',
      () => reject(new Error('Video playback error')),
      { once: true },
    );

    setTimeout(
      () => {
        console.warn('[video] Safety timeout hit - stopping recording');
        resolve();
      },
      (duration + 5) * 3 * 1000,
    );

    if (useVFC) {
      vfcVideo.requestVideoFrameCallback!(onFrame);
    } else {
      const tick = () => {
        if (video.ended || video.currentTime >= duration) {
          resolve();
          return;
        }

        onFrame();

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    video.muted = true;

    video.play().catch((e) => {
      reject(
        new Error(
          'Could not play video: ' +
            (e instanceof Error ? e.message : String(e)),
        ),
      );
    });
  });
}

export async function processEveryFrame(
  video: HTMLVideoElement,
  maskImageData: ImageData,
  inpaintFn: (frame: ImageData, mask: ImageData) => Promise<ImageData>,
  outCtx: CanvasRenderingContext2D,
  outCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  duration: number,
  fps: number,
  opts: ProcessVideoArgs['opts'],
  onProgress: ProcessVideoArgs['onProgress'],
): Promise<{
  recorder: MediaRecorder;
  chunks: Blob[];
  recordingDone: Promise<void>;
  mimeType: string;
}> {
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDurationMs = 1000 / fps;

  // ==== Pass 1 - AI inference ====
  const frameBlobs: Blob[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const time = Math.min((i / totalFrames) * duration, duration - 0.001);

    const frameData = await grabFrameAt(video, time, width, height);
    const inpainted = await inpaintFn(frameData, maskImageData);

    const cv = new OffscreenCanvas(width, height);
    (cv.getContext('2d') as OffscreenCanvasRenderingContext2D).putImageData(
      inpainted,
      0,
      0,
    );
    frameBlobs.push(
      await cv.convertToBlob({ type: 'image/jpeg', quality: 0.88 }),
    );

    // Progress: 15% - 98%
    const pct = Math.min(98, 15 + ((i + 1) / totalFrames) * 83);
    onProgress?.(
      pct,
      `AI: frame ${i + 1} / ${totalFrames} (${time.toFixed(1)}s)`,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const canvasStream = (outCanvas as CaptureableCanvas).captureStream(0);
  const canvasTrack = canvasStream.getVideoTracks()[0] as MediaStreamTrack & {
    requestFrame?: () => void;
  };

  video.currentTime = 0;
  await waitForSeeked(video);
  video.muted = true;

  const mediaStream = new MediaStream([canvasTrack]);
  if (opts?.includeAudio !== false) {
    const audioTrack = tryCaptureAudioTrack(video);
    if (audioTrack) mediaStream.addTrack(audioTrack);
  }

  const { recorder, chunks, recordingDone, mimeType } = createRecorder(
    mediaStream,
    opts,
  );
  video.play().catch(() => {});
  recorder.start();

  for (let i = 0; i < frameBlobs.length; i++) {
    const frameStart = performance.now();

    const bitmap = await createImageBitmap(frameBlobs[i]);
    outCtx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    canvasTrack.requestFrame?.();

    const elapsed = performance.now() - frameStart;
    const remaining = frameDurationMs - elapsed;
    if (remaining > 0) {
      await new Promise<void>((r) => setTimeout(r, remaining));
    }

    const pct = Math.min(99, 70 + ((i + 1) / frameBlobs.length) * 29);
    onProgress?.(pct, `Encoding: frame ${i + 1}/${frameBlobs.length}`);
  }

  return { recorder, chunks, recordingDone, mimeType };
}

function waitForSeeked(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    return video.addEventListener('seeked', () => resolve(), { once: true });
  });
}

function tryCaptureAudioTrack(
  video: HTMLVideoElement,
): MediaStreamTrack | null {
  try {
    const v = video as CaptureableVideo;

    const srcStream = v.captureStream
      ? v.captureStream()
      : v.mozCaptureStream?.();

    return srcStream?.getAudioTracks()[0] ?? null;
  } catch {
    return null;
  }
}

async function grabFrameAt(
  video: HTMLVideoElement,
  time: number,
  width: number,
  height: number,
): Promise<ImageData> {
  video.currentTime = time;
  await waitForSeeked(video);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  }) as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(video, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}
