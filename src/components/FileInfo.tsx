import type { ReactElement } from "react";
import { Button, Card } from "./ui";
import type { StudioApi } from "../models/studio.model";

const FileInfo = (studio: StudioApi): ReactElement => {
  const {
    file,
    kind,
    hasResult,
    showResult,
    selectingVideoMask,
    processing,
    modal,
  } = studio;

  const isVideo = kind === "video";
  const showingVideoResult = isVideo && hasResult && showResult;
  const selectingFrame = isVideo && selectingVideoMask && !showingVideoResult;

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="primary"
        disabled={!isVideo && !showingVideoResult && !processing && !modal}
        onClick={
          selectingFrame ? studio?.resumeVideoPreview : studio?.selectVideoFrame
        }
      >
        {selectingFrame ? "Back to video" : "Select watermark on this frame"}
      </Button>
      <Card title="File">
        <p
          className="truncate font-mono text-[13px] text-ink"
          title={file?.name}
        >
          {file?.name ?? "No file loaded"}
        </p>
        <div className="my-1.5 flex gap-2 font-mono text-[11px]">
          <span>{file?.dims ?? "— × —"}</span>
          <span>·</span>
          <span>{file?.size ?? "— MB"}</span>
        </div>
        <Button full disabled={!file} size="sm" onClick={studio?.reset}>
          Replace file
        </Button>
      </Card>
    </div>
  );
};

export default FileInfo;
