import { fail, ok } from "@/lib/http";
import { getWorkstation } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok(getWorkstation("open"));
  } catch (error) {
    return fail(error);
  }
}
