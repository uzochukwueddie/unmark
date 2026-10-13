import { type ReactElement } from "react";
import TopBar from "./components/TopBar";
import EditorPage from "./pages/EditorPage";
import type { EngineStatus } from "./models/app.model";
import { useStudio } from "./hooks/useStudio";

const App = (): ReactElement => {
  const studio = useStudio();

  const status: EngineStatus = studio?.model?.failed
    ? { kind: "error", label: "Failed" }
    : studio?.processing
      ? { kind: "busy", label: "Processing" }
      : studio?.model.ready
        ? { kind: "ready", label: `Ready (${studio.model.backend})` }
        : { kind: "busy", label: "Loading model" };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar status={status} />

      <div className="flex-1">
        <EditorPage studio={studio} />
      </div>
    </div>
  );
};

export default App;
