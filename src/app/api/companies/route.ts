import { fail, ok } from "@/lib/http";
import { listCompanies } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok({ companies: listCompanies() });
  } catch (error) {
    return fail(error);
  }
}
