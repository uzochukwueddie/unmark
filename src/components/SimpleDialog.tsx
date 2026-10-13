import type { StudioApi } from "../models/studio.model";
import { Button, Progress } from "./ui";

const SimpleDialog = (studio: StudioApi) => {
  const { modal } = studio;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="absolute inset-0 z-30 grid place-items-center bg-base/85 backdrop-blur-sm"
    >
      <div className="animate-rise w-[min(24rem,90%)] rounded-2xl border border-line bg-card p-6 text-center">
        <div className="text-3xl" aria-hidden="true">
          {modal?.icon}
        </div>
        <h3 className="mt-3 text-ink font-bold">{modal?.title}</h3>
        <p className="mt-2 mb-5 whitespace-pre-line text-[12px] leading-relaxed text-ink-soft">
          {modal?.message}
        </p>
        <Button
          variant="primary"
          autoFocus
          onClick={() => studio.setModal(null)}
        >
          OK, got it
        </Button>
      </div>
    </div>
  );
};

const DialogProgress = (studio: StudioApi) => {
  const { processing } = studio;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-base/85 backdrop-blur-sm">
      <div className="animate-rise w-[min(26rem,90%)] rounded-2xl border border-line bg-card p-6 text-center">
        <div className="mx-auto mb-4 size-9 animate-spin rounded-full border-2 border-line border-t-accent-soft" />
        <h3 className="text-ink font-bold ">{processing?.title}</h3>
        <p className="mx-auto mt-1.5 mb-4 max-w-xs text-[12px] leading-relaxed text-ink-soft">
          {processing?.sub}
        </p>
        <Progress
          percent={processing!.percent}
          indeterminate={processing!.percent < 100}
        />
        <p className="mt-3 font-mono text-[11px]">{processing?.stage}</p>
      </div>
    </div>
  );
};

export { SimpleDialog, DialogProgress };
