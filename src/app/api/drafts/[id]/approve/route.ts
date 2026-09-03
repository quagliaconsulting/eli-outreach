import { fail, ok } from "@/lib/http";
import { isSendEnabled } from "@/lib/smtp";
import { approveAndSendDraft, approveDraft } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const draftId = Number(id);
    if (isSendEnabled()) {
      return ok(await approveAndSendDraft(draftId));
    }
    return ok(approveDraft(draftId));
  } catch (error) {
    return fail(error);
  }
}
