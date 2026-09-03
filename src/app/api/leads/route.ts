import { fail, ok } from "@/lib/http";
import { getWorkstation } from "@/lib/store";
import type { LeadSort, LeadTier, WorkstationFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS = new Set<WorkstationFilter>(["open", "sent", "all"]);
const SORTS = new Set<LeadSort>(["quality", "added", "company"]);
const TIERS = new Set<LeadTier>(["A", "B", "C"]);

function truthy(value: string | null): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawFilter = params.get("filter") ?? "open";
    const rawSort = params.get("sort") ?? "quality";
    const rawTier = (params.get("tier") ?? "").toUpperCase();
    const filter: WorkstationFilter = FILTERS.has(rawFilter as WorkstationFilter)
      ? (rawFilter as WorkstationFilter)
      : "open";
    const sort: LeadSort = SORTS.has(rawSort as LeadSort) ? (rawSort as LeadSort) : "quality";
    const tier: LeadTier | null = TIERS.has(rawTier as LeadTier) ? (rawTier as LeadTier) : null;
    return ok(
      getWorkstation({
        filter,
        sort,
        email: truthy(params.get("email")),
        tier,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
