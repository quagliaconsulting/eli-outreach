import { fail, ok } from "@/lib/http";
import { getWorkstation } from "@/lib/store";
import type { WorkstationFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS = new Set<WorkstationFilter>(["open", "sent", "all"]);

export function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("filter") ?? "open";
    const filter: WorkstationFilter = FILTERS.has(raw as WorkstationFilter)
      ? (raw as WorkstationFilter)
      : "open";
    return ok(getWorkstation(filter));
  } catch (error) {
    return fail(error);
  }
}
