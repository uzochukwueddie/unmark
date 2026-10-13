import type { ReactElement } from "react";
import type { EngineStatus } from "../models/app.model";
import { APP_VERSION } from "../lib/version";

const TopBar = ({ status }: { status: EngineStatus }): ReactElement => {
  const tone =
    status.kind === "ready"
      ? "bg-ok"
      : status.kind === "busy"
        ? "bg-warn animate-pulse"
        : status.kind === "error"
          ? "bg-bad"
          : "bg-ink-mute";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/40 backgrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.svg" alt="Logo" className="size-7" />
          <span className="text-[15px] font-bold tracking-tight text-ink">
            Unmark
          </span>
          <span className="hidden rounded-md border border-line bg-surface px-1.5 font-mono text-[10px] sm:inline">
            v{APP_VERSION}
          </span>
        </div>

        {status && (
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-soft md:inline-flex">
            <span className={`size-1.5 rounded-full ${tone}`} />
            {status.label}
          </span>
        )}
      </div>
    </header>
  );
};

export default TopBar;
