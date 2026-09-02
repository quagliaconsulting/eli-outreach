import { NextResponse } from "next/server";
import { resolveDataDir } from "@/lib/db";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  const settings = getSettings();
  return NextResponse.json({
    ok: true,
    service: "eli-outreach",
    timezone: settings.timezone,
    from: settings.sender_email,
    dataDir: resolveDataDir(),
    send: false,
  });
}
