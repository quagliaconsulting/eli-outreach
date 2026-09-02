import { fail, ok, readJson } from "@/lib/http";
import { createCompaniesBulk } from "@/lib/store";
import type { CompanyWriteInput } from "@/lib/types";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ companies?: CompanyWriteInput[] }>(request);
    if (!Array.isArray(body.companies)) {
      throw new RuleError("companies array is required.", "validation");
    }
    return ok({ companies: createCompaniesBulk(body.companies) }, 201);
  } catch (error) {
    return fail(error);
  }
}
