import { fail, ok, readJson } from "@/lib/http";
import { upsertCrm } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson<{
      freight_profile?: string;
      decision_notes?: string;
      next_meeting_at?: string | null;
    }>(request);
    return ok(
      upsertCrm(Number(id), {
        freight_profile: body.freight_profile ?? "",
        decision_notes: body.decision_notes ?? "",
        next_meeting_at: body.next_meeting_at ?? null,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
