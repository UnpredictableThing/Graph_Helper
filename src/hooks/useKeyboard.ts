import { useEffect } from "react";
import { useGraph } from "../store/graphStore";

export function useKeyboard() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        useGraph.getState().undo();
        return;
      }

      if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useGraph.getState().redo();
        return;
      }

      // альтернативный вариант: Ctrl+Shift+Z — тоже redo
      if (ctrl && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        useGraph.getState().redo();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}