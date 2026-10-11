import { useEffect } from "react";
import Canvas from "./components/Canvas";
import Toolbar from "./components/Toolbar";
import Breadcrumbs from "./components/Breadcrumbs";
import PropertiesPanel from "./components/PropertiesPanel";
import SettingsModal from "./components/SettingsModal";
import TreeNavigator from "./components/TreeNavigator";
import { useKeyboard } from "./hooks/useKeyboard";
import { useGraph } from "./store/graphStore";
import AddNodePalette from "./components/AddNodePalette";
import DeadlineNotifications from "./components/DeadlineNotifications";

const OFFSET_PX: Record<string, number> = {
  off: 0,
  small: 24,
  medium: 40,
  large: 56,
};

export default function App() {
  useKeyboard();
  const treeOpen = useGraph((s) => s.treeOpen);
  const toolbarOffset = useGraph((s) => s.settings.toolbarOffset);
  const padTop = OFFSET_PX[toolbarOffset] ?? 0;

  useEffect(() => {
    const id = setInterval(() => {
      useGraph.getState().tick();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        useGraph.getState().tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        paddingTop: padTop,
        background: "var(--bg-secondary)",
      }}
    >
      <Toolbar />
      <Breadcrumbs />
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <DeadlineNotifications />
          <Canvas />
        </div>
        <PropertiesPanel />
        {treeOpen && <TreeNavigator />}
      </div>
      <SettingsModal />
      <AddNodePalette />
    </div>
  );
}