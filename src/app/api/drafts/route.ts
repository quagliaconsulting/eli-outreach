import { fail, ok, readJson } from "@/lib/http";
import { createFirstTouchDraft, listDrafts } from "@/lib/store";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return ok({ drafts: listDrafts(status) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      company_id?: number;
      contact_id?: number;
      hook_line?: string;
    }>(request);
    if (!body.company_id || !body.contact_id || !body.hook_line) {
      throw new RuleError("company_id, contact_id, and hook_line are required.", "validation");
    }
    return ok(
      createFirstTouchDraft({
        company_id: body.company_id,
        contact_id: body.contact_id,
        hook_line: body.hook_line,
      }),
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
