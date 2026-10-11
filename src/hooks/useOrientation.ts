import { useEffect, useState } from "react";

export type Orientation = "portrait" | "landscape";

export function useOrientation(): Orientation {
  const getOrientation = (): Orientation =>
    window.innerWidth > window.innerHeight ? "landscape" : "portrait";

  const [orientation, setOrientation] = useState<Orientation>(getOrientation);

  useEffect(() => {
    const update = () => setOrientation(getOrientation());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return orientation;
}