import { fail, ok } from "@/lib/http";
import { markDraftSent } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok(markDraftSent(Number(id)));
  } catch (error) {
    return fail(error);
  }
}
