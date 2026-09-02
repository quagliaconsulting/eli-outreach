import { fail, ok, readJson } from "@/lib/http";
import { COMPANY_STAGES, type CompanyStage } from "@/lib/constants";
import { getCompany, updateCompanyStage } from "@/lib/store";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(getCompany(Number(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{ stage?: CompanyStage }>(request);
    if (!body.stage || !COMPANY_STAGES.includes(body.stage)) {
      throw new RuleError("A valid stage is required.", "validation");
    }
    return ok(updateCompanyStage(Number(id), body.stage));
  } catch (error) {
    return fail(error);
  }
}
