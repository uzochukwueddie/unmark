import type { ReactElement } from "react";
import type { ReadFileResult } from "../models/types";
import { useDropzone } from "../hooks/useDropzone";
import { Button } from "./ui";
import { FORMATS } from "../models/app.model";

const Dropzone = ({
  onFile,
}: {
  onFile: (result: ReadFileResult) => void;
}): ReactElement => {
  const { isDragging, dropzoneProps, inputProps, openPicker } =
    useDropzone(onFile);

  return (
    <div
      {...dropzoneProps}
      className={[
        "group relative flex h-full min-h-105 cursor-pointer flex-col items-center justify-center",
        "rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
        isDragging
          ? "border-accent bg-accent/10 scale-[1.01]"
          : "border-line bg-card/40 hover:border-accent/50 hover:bg-card/70",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[90px]"
      />
      <i
        className={`fa-solid fa-arrow-up-from-bracket relative text-[3.5rem] leading-none transition-transform duration-200 ${
          isDragging
            ? "scale-110 text-accent-soft"
            : "group-hover:text-accent-soft"
        }`}
        aria-hidden="true"
      />

      <h2 className="relative mt-5 text-xl font-bold text-ink sm:text-2xl">
        {isDragging ? "Drop it here" : "Drop a video to start"}
      </h2>
      <p className="relative mt-2 text-[13px] text-ink-soft">
        MP4, WEBM, MOV, MKV - up to 300 MB
      </p>

      <Button variant="primary" className="relative mt-6" onClick={openPicker}>
        Browse files
      </Button>

      <input {...inputProps} />

      <div className="relative mt-7 flex flex-wrap justify-center gap-1.5">
        {FORMATS.map((f) => (
          <span
            key={f}
            className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10px]"
          >
            {f}
          </span>
        ))}
      </div>

      <p className="relative mt-7 max-w-sm text-[12px] leading-relaxed">
        Nothing is uploaded. The file is decoded in this tab and the AI runs on
        your own device.
      </p>
    </div>
  );
};

export default Dropzone;
