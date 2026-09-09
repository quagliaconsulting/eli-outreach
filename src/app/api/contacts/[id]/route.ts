import { fail, ok, readJson } from "@/lib/http";
import { updateContact } from "@/lib/store";
import type { ContactWriteInput } from "@/lib/types";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const contactId = Number(id);
    if (!Number.isInteger(contactId) || contactId <= 0) {
      throw new RuleError("Contact not found.", "not_found");
    }
    const body = await readJson<ContactWriteInput>(request);
    return ok(updateContact(contactId, body ?? {}));
  } catch (error) {
    return fail(error);
  }
}
