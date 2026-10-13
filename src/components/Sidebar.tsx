import type { ReactElement } from "react";
import { Button, Card, Hint, Label, RadioGroup, Select } from "./ui";
import {
  INFERENCE_MODE_HINTS,
  INFERENCE_MODE_OPTIONS,
  QUALITY_HINTS,
  QUALITY_OPTIONS,
} from "../models/app.model";
import type { StudioApi } from "../models/studio.model";

const Sidebar = (studio: StudioApi): ReactElement => {
  const {
    file,
    quality,
    outputFormat,
    formats,
    model,
    hasResult,
    canRemove,
    processing,
    inferenceMode,
  } = studio;

  return (
    <aside className="scroll-slim flex w-full shrink-0 flex-col gap-3 overflow-y-auto pb-4 lg:w-77.5">
      <Button
        full
        variant="secondary"
        disabled={!hasResult}
        onClick={studio?.download}
      >
        <span aria-hidden="true">↓</span> Download result
      </Button>

      <Card title="Removal settings">
        <Label className="mt-5">AI inference mode</Label>
        <RadioGroup
          name="inferenceMode"
          ariaLabel="AI inference mode"
          value={inferenceMode}
          onChange={(v) =>
            studio?.setInferenceMode(v as StudioApi["inferenceMode"])
          }
          options={INFERENCE_MODE_OPTIONS}
        />
        <Hint>{INFERENCE_MODE_HINTS[inferenceMode]}</Hint>

        <Label className="mt-5">Quality</Label>
        <RadioGroup
          name="quality"
          ariaLabel="Removal quality"
          value={quality}
          onChange={(v) => studio?.setQuality(v as StudioApi["quality"])}
          options={QUALITY_OPTIONS}
        />
        <Hint>{QUALITY_HINTS[quality]}</Hint>

        <Label className="mt-5">Video format</Label>
        <Select
          value={outputFormat}
          onChange={(e) =>
            studio.setOutputFormat(e.target.value as StudioApi["outputFormat"])
          }
        >
          {formats?.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </Card>

      <div className="grid gap-2">
        <Button
          variant="primary"
          full
          disabled={!canRemove}
          onClick={studio?.removeWatermark}
          title={
            !file
              ? "Drop a video first"
              : !model.ready
                ? "Waiting for the AI model to finish loading…"
                : "Remove the watermark inside your mask"
          }
        >
          <span aria-hidden="true">✦</span>
          {processing ? "Working…" : "Remove watermark"}
        </Button>

        <Button
          variant="danger"
          full
          disabled={!file}
          onClick={studio?.reset}
          title="Discard this file (Esc)"
        >
          <span aria-hidden="true">🗑</span> Delete &amp; start over
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
