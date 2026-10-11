export type NodeId = string;
export type EdgeId = string;
export type GraphId = string;

export type PropValue = string | number | boolean;

export interface NodeProp {
  id: string;
  key: string;
  value: PropValue;
}

export interface GraphNode {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  props: NodeProp[];
  modules: string[];
  data: Record<string, unknown>;
  childGraphId: GraphId | null;
  color?: string;
  tags?: string[];
}

export interface DeadlineOnce {
  kind: "once";
  id: string;
  title: string;
  at: number;
  createdAt: number;
  confirmed: boolean;
  image?: string;
  showGreen: boolean;
}

export interface DeadlineRecurring {
  kind: "recurring";
  id: string;
  title: string;
  days: number[];
  hour: number;
  minute: number;
  enabled: boolean;
  image?: string;
  lastFiredAt?: number;
}

export type DeadlineItem = DeadlineOnce | DeadlineRecurring;

export interface DeadlineData {
  items: DeadlineItem[];
}
export type DeadlineStatus = "green" | "yellow" | "red" | "overdue";
export type DeadlineEntryStatus = DeadlineStatus | "recurring";

export interface EdgePoint {
  x: number;
  y: number;
}

export interface GraphEdge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  label?: string;
  points?: EdgePoint[];
  fromEdgeId?: string;
  fromPointIndex?: number;
}

export interface Viewport {
  x: number;
  y: number;
  k: number;
}

export interface Graph {
  id: GraphId;
  parentNodeId: NodeId | null;
  parentGraphId: GraphId | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport: Viewport;
  createdAt: number;
  updatedAt: number;
}

export interface Scene {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type Theme = "dark" | "light";
export type Language = "ru" | "en";

export type ToolbarOffset = "off" | "small" | "medium" | "large";

export type PaletteLayout = "column" | "grid" | "circle";

export interface PaletteNodeConfig {
  title: string;
  props: NodeProp[];
  modules: string[];
  data: Record<string, unknown>;
}

export interface PaletteConfig {
  count: number;
  layout: PaletteLayout;
  color?: string;
  node: PaletteNodeConfig;
}

export interface AppSettings {
  theme: Theme;
  language: Language;
  fontSize: "small" | "medium" | "large";
  showGrid: boolean;
  snapToGrid: boolean;
  toolbarOffset: ToolbarOffset;
}