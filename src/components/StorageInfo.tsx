import type { ReactElement } from "react";
import { Button, Card } from "./ui";
import type { StudioApi } from "../models/studio.model";

function StatusRow({
  term,
  value,
  tone = "",
}: {
  term: string;
  value: string;
  tone?: "ok" | "warn" | "";
}) {
  const color =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink-soft";

  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-[11px]">{term}</dt>
      <dd className={`truncate font-mono text-[11px] ${color}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

const StorageInfo = (studio: StudioApi): ReactElement => {
  const { model, storage } = studio;

  return (
    <Card title="Storage & Engine" className="h-52 flex w-full flex-col gap-3">
      <dl className="divide-y divide-line/60">
        <StatusRow
          term="AI Model"
          value={
            model?.cacheState === "cached"
              ? "On your device ✓"
              : model?.cacheState === "error"
                ? "Error"
                : "Downloading..."
          }
          tone={
            model?.cacheState === "cached"
              ? "ok"
              : model?.cacheState === "error"
                ? ""
                : "warn"
          }
        />
        <StatusRow
          term="Running on"
          value={model?.backend ?? "WEBGL"}
          tone={model?.ready ? "ok" : ""}
        />
        <StatusRow term="Used" value={storage?.used} />
      </dl>
      <Button
        full
        size="sm"
        className="mt-2"
        onClick={() => {
          if (
            window.confirm(
              "Delete the cached AI model? It will re-download (~29 MB) next time.",
            )
          ) {
            studio.forgetModel();
          }
        }}
      >
        🗑 Clear cached model
      </Button>
    </Card>
  );
};

export default StorageInfo;
