import { fail, ok, readJson } from "@/lib/http";
import { updateContactsBulkEmail } from "@/lib/store";
import type { ContactEmailUpdate } from "@/lib/types";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ updates?: ContactEmailUpdate[] }>(request);
    if (!Array.isArray(body.updates)) {
      throw new RuleError("updates array is required.", "validation");
    }
    return ok(updateContactsBulkEmail(body.updates));
  } catch (error) {
    return fail(error);
  }
}
