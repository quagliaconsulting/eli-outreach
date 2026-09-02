import { fail, ok, readJson } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return ok(getSettings());
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{
      sender_name?: string;
      sender_phone?: string;
      fleet_counts_enabled?: boolean;
    }>(request);
    return ok(
      updateSettings({
        sender_name: body.sender_name,
        sender_phone: body.sender_phone,
        fleet_counts_enabled: body.fleet_counts_enabled,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
