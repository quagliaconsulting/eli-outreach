import { fail, ok } from "@/lib/http";
import { getTodayBoard } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok(getTodayBoard());
  } catch (error) {
    return fail(error);
  }
}
