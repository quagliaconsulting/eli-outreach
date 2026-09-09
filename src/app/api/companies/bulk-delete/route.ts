import { fail, ok, readJson } from "@/lib/http";
import { deleteCompaniesBulk } from "@/lib/store";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ ids?: number[] }>(request);
    if (!Array.isArray(body.ids)) {
      throw new RuleError("ids array is required.", "validation");
    }
    return ok(deleteCompaniesBulk(body.ids));
  } catch (error) {
    return fail(error);
  }
}
