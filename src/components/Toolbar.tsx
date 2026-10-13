import { TOOLS, type ToolButtonProps } from "../models/app.model";
import type { StudioApi } from "../models/studio.model";
import { Button } from "./ui";

function ToolButton({ active, danger, children, ...props }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-transparent text-bad/80 hover:bg-bad/10 hover:text-bad"
          : active
            ? "border-accent/60 bg-accent/15 text-accent-soft"
            : "border-line bg-surface hover:bg-hover hover:text-ink",
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-line" />
  );
}

export default function Toolbar(studio: StudioApi) {
  const {
    tool,
    brushSize,
    hasResult,
    showResult,
    zoomLevel,
    zoomIn,
    zoomOut,
    zoomReset,
  } = studio;

  return (
    <div className="scroll-slim flex items-center gap-1.5 overflow-x-auto rounded-xl border border-line bg-card/70 p-2">
      {TOOLS.map((t) => (
        <ToolButton
          key={t.value}
          active={tool === t.value}
          title={t.title}
          onClick={() => studio.selectTool(t.value)}
        >
          <span aria-hidden="true">{t.icon}</span> {t.label}
        </ToolButton>
      ))}

      <Divider />

      <label htmlFor="brush-size" className="shrink-0 text-[11px]">
        Size
      </label>
      <input
        id="brush-size"
        type="range"
        min="2"
        max="120"
        value={brushSize}
        onChange={(e) => studio?.setBrushSize(+e.target.value)}
        className="range w-24 shrink-0"
      />
      <span className="w-6 shrink-0 font-mono text-[11px] text-ink-soft">
        {brushSize}
      </span>

      <Divider />

      <ToolButton onClick={studio.undo} title="Undo (Ctrl+Z)">
        ↶ Undo
      </ToolButton>
      <ToolButton onClick={studio.clearMask} title="Clear mask">
        ✕ Clear
      </ToolButton>

      <ToolButton
        active={hasResult && !showResult}
        disabled={!hasResult}
        onClick={studio.toggleCompare}
        title="Compare before / after (Space)"
      >
        ⊟ Compare
      </ToolButton>

      <Divider />

      {/* Zoom controls */}
      <ToolButton
        onClick={zoomOut}
        disabled={zoomLevel <= 0.25}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <i
          className="fa-solid fa-magnifying-glass-minus"
          style={{ fontSize: "14px" }}
          aria-hidden="true"
        />
      </ToolButton>

      <Button
        type="button"
        onClick={zoomReset}
        title="Reset zoom to 100%"
        className="shrink-0 w-12 rounded-md border border-line bg-surface px-1 py-1 font-mono text-[11px] hover:bg-hover hover:text-ink transition"
      >
        {Math.round(zoomLevel * 100)}%
      </Button>

      <ToolButton
        onClick={zoomIn}
        disabled={zoomLevel >= 4}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <i
          className="fa-solid fa-magnifying-glass-plus"
          style={{ fontSize: "14px" }}
          aria-hidden="true"
        />
      </ToolButton>

      <Divider />

      <span className="ml-auto" />

      <ToolButton
        danger
        onClick={() => {
          if (window.confirm("Discard this file and start over?"))
            studio.reset();
        }}
        title="Delete this file and start over (Esc)"
      >
        <span aria-hidden="true">🗑</span> Delete
      </ToolButton>
    </div>
  );
}
