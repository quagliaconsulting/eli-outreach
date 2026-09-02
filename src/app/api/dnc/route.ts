import { fail, ok, readJson } from "@/lib/http";
import { addDnc, listDnc } from "@/lib/store";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok({ entries: listDnc() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      company_id?: number | null;
      contact_id?: number | null;
      company_name?: string | null;
      email?: string | null;
      phone?: string | null;
      reason?: string;
    }>(request);
    if (!body.reason) throw new RuleError("Reason is required.", "validation");
    return ok(addDnc({ ...body, reason: body.reason }), 201);
  } catch (error) {
    return fail(error);
  }
}
