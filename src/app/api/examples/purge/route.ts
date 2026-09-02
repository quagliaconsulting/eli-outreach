import { fail, ok } from "@/lib/http";
import { purgeExampleCompanies } from "@/lib/store";

export const dynamic = "force-dynamic";

export function POST() {
  try {
    return ok(purgeExampleCompanies());
  } catch (error) {
    return fail(error);
  }
}
