import { fail, ok, readJson } from "@/lib/http";
import { logCall } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{ contact_id?: number | null; notes?: string }>(request);
    return ok(logCall(Number(id), body.contact_id ?? null, body.notes ?? "Logged call."));
  } catch (error) {
    return fail(error);
  }
}
