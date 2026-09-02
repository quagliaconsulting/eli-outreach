import { fail, ok } from "@/lib/http";
import { listActivities } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return ok({ activities: listActivities(Number(id)) });
  } catch (error) {
    return fail(error);
  }
}
