import type { StudioApi } from "../models/studio.model";
import { Button, Card, Hint, Label } from "./ui";

// A preset palette of neutral / skin-tone / background-typical colours
// that users most often need to blend into a cleaned-up area.
// const PRESETS = [
//   { color: "#000000", label: "Black" },
//   { color: "#1a1a2e", label: "Dark navy" },
//   { color: "#2d2d2d", label: "Charcoal" },
//   { color: "#4a4a4a", label: "Dark grey" },
//   { color: "#6b6b6b", label: "Mid grey" },
//   { color: "#9e9e9e", label: "Silver" },
//   { color: "#c8c8c8", label: "Light grey" },
//   { color: "#ffffff", label: "White" },
//   { color: "#f5e6c8", label: "Cream" },
//   { color: "#d4a373", label: "Sand" },
//   { color: "#8b6914", label: "Golden" },
//   { color: "#5c3d2e", label: "Brown" },
//   { color: "#1b4332", label: "Dark green" },
//   { color: "#264653", label: "Dark teal" },
//   { color: "#2b6cb0", label: "Royal blue" },
//   { color: "#7b2d8b", label: "Purple" },
// ];

/**
 * Color touch-up panel.
 *
 * Appears in the sidebar after a removal result is ready. The user can:
 *   1. Pick a custom colour via the native colour-picker.
 *   2. Click a quick-access preset swatch.
 *   3. Adjust the blend opacity with a slider (0 = AI result, 1 = solid fill).
 *   4. Apply — re-records the video using the chosen blend (fast, no AI re-run).
 *   5. Reset — discard the colour and go back to the raw AI result.
 */
export default function ColorTouchUp(studio: StudioApi) {
  const {
    patchColor,
    patchOpacity,
    isApplyingColor,
    canColorPatch,
    hasResult,
    processing,
  } = studio;

  // Only render when there is an AI result to blend onto.
  if (!hasResult) return null;

  const busy = !!processing || isApplyingColor;

  return (
    <Card title="Color touch-up">
      <p className="mb-3 text-[11px] leading-relaxed text-ink-soft">
        Pick a colour to paint over the cleaned area so it blends with the
        surrounding background. Adjust the blend strength, then click{" "}
        <strong className="text-ink">Apply</strong>. No AI re-run — it&apos;s
        fast.
      </p>

      {/* Custom colour picker + current swatch */}
      <Label className="mt-4">Choose colour</Label>
      <div className="flex items-center gap-3">
        <label
          htmlFor="patch-color-input"
          className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-line transition hover:border-accent-soft"
          title="Open colour picker"
          style={{
            background: patchColor ?? "conic-gradient(#ccc 90deg, #fff 90deg)",
          }}
        >
          <input
            id="patch-color-input"
            type="color"
            value={patchColor ?? "#ffffff"}
            onChange={(e) => studio.setPatchColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={busy}
          />
          {!patchColor && (
            <span className="pointer-events-none text-[16px]">🎨</span>
          )}
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12px] text-ink">
            {patchColor ?? "No colour selected"}
          </p>
          <p className="text-[10px] text-ink-soft">
            Click the swatch or pick a preset below
          </p>
        </div>
      </div>

      {/* Preset swatches */}
      {/* <Label className="mt-4">Quick presets</Label>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.color}
            type="button"
            title={p.label}
            disabled={busy}
            onClick={() => studio.setPatchColor(p.color)}
            className={[
              "h-6 w-6 shrink-0 rounded-md border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              patchColor === p.color
                ? "border-accent scale-110 shadow-md"
                : "border-line/50 hover:border-line-strong hover:scale-105",
              busy ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            ].join(" ")}
            style={{ background: p.color }}
            aria-label={p.label}
            aria-pressed={patchColor === p.color}
          />
        ))}
      </div> */}

      {/* Opacity / blend strength */}
      <Label className="mt-4">Blend strength</Label>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[10px] text-ink-soft">AI result</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={patchOpacity}
          onChange={(e) => studio.setPatchOpacity(+e.target.value)}
          disabled={busy}
          className="range flex-1"
          aria-label="Colour blend strength"
        />
        <span className="shrink-0 text-[10px] text-ink-soft">Solid fill</span>
      </div>
      <p className="mt-1 text-center font-mono text-[11px] text-ink-soft">
        {Math.round(patchOpacity * 100)}% colour
      </p>
      <Hint>
        Lower values keep more AI detail; higher values paint more solidly with
        your chosen colour.
      </Hint>

      {/* Actions */}
      <div className="mt-4 grid gap-2">
        <Button
          variant="primary"
          full
          disabled={!patchColor || busy || !canColorPatch}
          onClick={() => studio.applyColorPatch()}
          title={
            !patchColor
              ? "Pick a colour first"
              : !canColorPatch
                ? "Run watermark removal first"
                : `Apply ${Math.round(patchOpacity * 100)}% colour blend and re-record`
          }
        >
          <span aria-hidden="true">🎨</span>
          {isApplyingColor ? "Applying…" : "Apply colour"}
        </Button>

        <Button
          variant="ghost"
          full
          disabled={busy || !canColorPatch}
          onClick={() => studio.resetColorPatch()}
          title="Remove colour blend and restore the AI-only result"
        >
          <span aria-hidden="true">↺</span> Reset to AI result
        </Button>
      </div>
    </Card>
  );
}
