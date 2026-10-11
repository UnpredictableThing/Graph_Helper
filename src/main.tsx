import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useGraph } from "./store/graphStore";
import "./index.css";

// временно для отладки
(window as any).__store = useGraph;

const root = createRoot(document.getElementById("root")!);

useGraph
  .getState()
  .init()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err) => {
    console.error("init failed:", err);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });