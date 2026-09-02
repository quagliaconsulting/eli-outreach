import { fail, ok, readJson } from "@/lib/http";
import { addContact } from "@/lib/store";
import { RuleError } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      company_id?: number;
      first_name?: string;
      last_name?: string;
      title?: string;
      phone?: string | null;
      email?: string | null;
    }>(request);
    if (!body.company_id || !body.first_name) {
      throw new RuleError("company_id and first_name are required.", "validation");
    }
    return ok(
      addContact(body.company_id, {
        first_name: body.first_name,
        last_name: body.last_name ?? "",
        title: body.title,
        phone: body.phone,
        email: body.email,
      }),
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
