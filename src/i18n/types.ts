import ru from "./ru.json";

type Dict = typeof ru;

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Paths<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

export type TKey = Paths<Dict>;