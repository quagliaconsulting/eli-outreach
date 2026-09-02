import { fail, ok, readJson } from "@/lib/http";
import { createCompany, listCompanies } from "@/lib/store";
import type { CompanyWriteInput } from "@/lib/types";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok({ companies: listCompanies() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CompanyWriteInput>(request);
    if (!body?.name?.trim()) {
      throw new RuleError("Company name is required.", "validation");
    }
    return ok(createCompany(body), 201);
  } catch (error) {
    return fail(error);
  }
}
