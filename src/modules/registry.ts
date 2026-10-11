import type { FC } from "react";
import { LinkModule } from "./LinkModule";
import { ImageModule } from "./ImageModule";
import { NoteModule } from "./NoteModule";
import type { TKey } from "../i18n/types";
import { DeadlineModule } from "./DeadlineModule";

export interface ModuleProps {
  nodeId: string;
}

export interface ModuleDef {
  id: string;
  titleKey: TKey;
  icon: string;
  defaultData: () => Record<string, unknown>;
  Panel: FC<ModuleProps>;
}

export const MODULES: ModuleDef[] = [
  {
  id: "deadline",
  titleKey: "modules.deadline",
  icon: "⏰",
  defaultData: () => ({ items: [] }),
  Panel: DeadlineModule,
},
  {
    id: "link",
    titleKey: "modules.link",
    icon: "🔗",
    defaultData: () => ({ url: "", label: "" }),
    Panel: LinkModule,
  },
  {
    id: "image",
    titleKey: "modules.image",
    icon: "🖼",
    defaultData: () => ({ src: "", alt: "" }),
    Panel: ImageModule,
  },
  {
    id: "note",
    titleKey: "modules.note",
    icon: "📝",
    defaultData: () => ({ text: "" }),
    Panel: NoteModule,
  },
];

export const getModule = (id: string) => MODULES.find((m) => m.id === id);