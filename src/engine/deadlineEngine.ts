import type {
  Graph,
  GraphId,
  DeadlineItem,
  DeadlineRecurring,
  DeadlineStatus,
  DeadlineEntryStatus,
} from "./types";

export function getStatus(
  item: DeadlineItem,
  now: number,
): DeadlineStatus | null {
  if (item.kind === "recurring") return null;

  const total = item.at - item.createdAt;
  if (total <= 0) return "overdue";

  const left = item.at - now;
  if (left <= 0) return "overdue";

  const ratio = left / total;
  if (ratio > 0.5) return "green";
  if (ratio > 0.25) return "yellow";
  return "red";
}

function getDayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getOccurrenceForDate(
  dayStart: number,
  hour: number,
  minute: number,
): number {
  const d = new Date(dayStart);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function isRecurringActive(
  item: DeadlineRecurring,
  now: number,
): boolean {
  if (!item.enabled) return false;

  const today = getDayStart(now);
  const todayOccurrence = getOccurrenceForDate(today, item.hour, item.minute);
  const todayDay = new Date(today).getDay();

  if (!item.days.includes(todayDay)) return false;
  if (now < todayOccurrence) return false;
  if (item.lastFiredAt && item.lastFiredAt >= todayOccurrence) return false;

  return true;
}

export interface DeadlineEntry {
  item: DeadlineItem;
  graphId: GraphId;
  nodeId: string;
  nodeTitle: string;
  status: DeadlineEntryStatus;
}

export function collectDeadlines(
  graphs: Record<GraphId, Graph>,
  now: number,
): DeadlineEntry[] {
  const result: DeadlineEntry[] = [];

  for (const graphId of Object.keys(graphs)) {
    const graph = graphs[graphId];
    for (const node of graph.nodes) {
      const data = node.data.deadline as { items?: DeadlineItem[] } | undefined;
      if (!data?.items) continue;

      for (const item of data.items) {
        if (item.kind === "recurring") {
          if (!isRecurringActive(item, now)) continue;
          result.push({
            item,
            graphId,
            nodeId: node.id,
            nodeTitle: node.title,
            status: "recurring",
          });
        } else {
          if (!item.confirmed) continue;
          const status = getStatus(item, now);
          if (!status) continue;
          result.push({
            item,
            graphId,
            nodeId: node.id,
            nodeTitle: node.title,
            status,
          });
        }
      }
    }
  }

  const order: Record<DeadlineStatus, number> = {
    overdue: 0,
    red: 1,
    yellow: 2,
    green: 3,
  };

  result.sort((a, b) => {
    if (a.status === "recurring" && b.status !== "recurring") return -1;
    if (b.status === "recurring" && a.status !== "recurring") return 1;

    const so =
      (order[a.status as DeadlineStatus] ?? 99) -
      (order[b.status as DeadlineStatus] ?? 99);
    if (so !== 0) return so;

    const aTime = a.item.kind === "once" ? a.item.at : 0;
    const bTime = b.item.kind === "once" ? b.item.at : 0;
    return aTime - bTime;
  });

  return result;
}