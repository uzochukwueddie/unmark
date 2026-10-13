import type { ReactElement } from "react";
import FileInfo from "../components/FileInfo";
import StorageInfo from "../components/StorageInfo";
import Sidebar from "../components/Sidebar";
import Dropzone from "../components/Dropzone";
import Toolbar from "../components/Toolbar";
import Stage from "../components/Stage";
import type { StudioApi } from "../models/studio.model";
import ModelDialogLoader from "../components/ModelDialogLoader";

const EditorPage = ({ studio }: { studio: StudioApi }): ReactElement => {
  return (
    <>
      <section className="mx-auto max-w-[1600px] px-4 pb-2 text-center sm:px-6">
        <h1 className="mx-auto mt-4 max-w-3xl bg-linear-to-b from-ink to-ink-soft bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-[2.75rem] sm:leading-[1.1]">
          Free AI Video Watermark Remover
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Removes visible watermarks from short AI-generated or personal videos.
          The AI runs inside this browser tab, so your files are never uploaded
          anywhere.
        </p>
      </section>

      <ModelDialogLoader model={studio?.model} />

      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-stretch">
        <Sidebar {...studio} />

        <section className="flex max-h-[68vh] min-w-0 flex-1 flex-col gap-3">
          <div
            className={studio?.file ? "flex flex-1 flex-col gal-3" : "hidden"}
          >
            <Toolbar {...studio} />
            <Stage {...studio} />
          </div>
          {!studio?.file && <Dropzone onFile={studio?.loadFile} />}
        </section>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-77.5">
          <FileInfo {...studio} />
          <StorageInfo {...studio} />
          <p className="rounded-xl border border-ok/25 bg-ok/5 px-4 py-3 text-[12px] text-ok/90">
            🔒 Your file never leaves this browser tab.
          </p>
        </div>
      </main>
    </>
  );
};

export default EditorPage;
