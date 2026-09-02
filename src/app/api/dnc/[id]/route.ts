import { fail, ok } from "@/lib/http";
import { removeDnc } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    removeDnc(Number(id));
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
