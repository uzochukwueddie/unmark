import type { ReactElement } from "react";
import { DialogProgress, SimpleDialog } from "./SimpleDialog";
import type { StudioApi } from "../models/studio.model";

const Stage = (studio: StudioApi): ReactElement => {
  const { kind, hasResult, showResult, processing, modal, selectingVideoMask } =
    studio;

  const isVideo = kind === "video";
  const showingVideoResult = isVideo && hasResult && showResult;
  const selectingFrame = isVideo && selectingVideoMask && !showingVideoResult;

  const showOriginalCanvas = isVideo ? selectingFrame : !showResult;

  const showResultCanvas = !isVideo && showResult;

  const canDrawMask = isVideo ? selectingFrame : !showResult;

  const showOriginalVideo = isVideo && !showingVideoResult && !selectingFrame;
  const layer =
    "col-start-1 row-start-1 block max-w-none max-h-none rounded-lg";

  return (
    <div
      ref={studio?.stageRef}
      className="checkerboard relative grid h-158 min-h-0 min-w-0 flex-none overflow-auto rounded-xl border border-line p-4"
    >
      <div className="grid w-max shrink-0 m-auto">
        <canvas
          ref={studio?.imageCanvasRef}
          className={`${layer} ${showOriginalCanvas ? "" : "invisible"}`}
        />
        <canvas
          ref={studio?.resultCanvasRef}
          className={`${layer} ${showResultCanvas ? "" : "invisible"}`}
        />
        <canvas
          ref={studio?.maskCanvasRef}
          tabIndex={canDrawMask ? 0 : -1}
          role="application"
          aria-label="Watermark mask."
          onPointerDown={() => studio?.setMaskTouched(true)}
          className={`${layer} relative z-10 cursor-crosshair touch-none ${
            canDrawMask
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        <video
          ref={studio?.videoOriginalRef}
          controls
          playsInline
          preload="auto"
          className={`${layer} ${showOriginalVideo ? "" : "hidden"}`}
        />

        <video
          ref={studio?.videoResultRef}
          controls
          playsInline
          preload="auto"
          className={`${layer} ${showingVideoResult ? "" : "hidden"}`}
        />
      </div>

      {hasResult && (
        <span
          className={`pointer-events-none absolute left-4 top-4 rounded-lg px-2.5 py-1 font-mono text-[11px] backdrop-blur ${
            showResult ? "bg-ok/20 text-ok" : "bg-surface/80 text-ink-soft"
          }`}
        >
          {showResult ? "✓ After (cleaned)" : "Before (original)"}
        </span>
      )}

      {processing && <DialogProgress {...studio} />}

      {modal && <SimpleDialog {...studio} />}
    </div>
  );
};

export default Stage;
