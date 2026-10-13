import { Progress } from "./ui";
import type { ModelStatus } from "../models/types";

export default function ModelDialogLoader({ model }: { model: ModelStatus }) {
  // Already ready — nothing to show.
  if (model?.ready) return null;

  if (
    !model?.failed &&
    (model?.cacheState === "checking" || model?.cacheState === "cached")
  )
    return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={model?.title}
      className="absolute inset-0 z-30 grid place-items-center bg-base/85 backdrop-blur-sm"
    >
      <div
        className={`animate-rise w-[min(26rem,90%)] rounded-2xl border bg-card p-6 text-center ${
          model?.failed ? "border-bad/40" : "border-line"
        }`}
      >
        <div className="text-4xl" aria-hidden="true">
          {model?.failed ? "⚠️" : "⚙️"}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-center gap-2">
          <h3 className="font-bold text-ink">{model?.title}</h3>
          <span className="font-mono text-[11px] ">{model?.meta}</span>
        </div>

        <p className="mx-auto mt-2 mb-5 max-w-xs whitespace-pre-line text-[12px] leading-relaxed text-ink-soft">
          {model?.sub}
        </p>

        {!model?.failed && (
          <Progress
            percent={model?.percent}
            indeterminate={model?.percent > 0 && model?.percent < 100}
          />
        )}
      </div>
    </div>
  );
}
