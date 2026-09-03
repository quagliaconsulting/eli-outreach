import { PACKET_URL } from "./constants";
import { RuleError } from "./types";

const SITE_VISIT =
  /site visit|visit your (site|plant|warehouse|facility|yard)|stop by your|come by your|swing by your|tour your/i;

const LTL_LEAD =
  /\b(ltl|less[- ]than[- ]truckload)\b/i;

const FLEET_COUNTS =
  /\b(\d{2,4}\+?\s*(trucks?|tractors?|power units?|trailers?))\b/i;

export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits || null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function assertRealEmail(email: string | null | undefined): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  if (!normalized.includes("@") || normalized.endsWith("@")) {
    throw new RuleError("Email is incomplete. Do not invent a domain.", "invalid_email");
  }
  return normalized;
}

export function displayEmail(email: string | null | undefined): string | null {
  return normalizeEmail(email);
}

export function validateFirstTouchContent(input: {
  hookLine: string;
  subject: string;
  body: string;
  fleetCountsEnabled: boolean;
}): void {
  const hook = input.hookLine.trim();
  if (hook.length < 12) {
    throw new RuleError(
      "Hook line is too thin. Write why this shipper is a fit — do not invent an email.",
      "thin_hook",
    );
  }

  if (LTL_LEAD.test(hook) || LTL_LEAD.test(input.subject)) {
    throw new RuleError(
      "No LTL lead. First-touch leads with truckload capacity.",
      "no_ltl_lead",
    );
  }

  if (SITE_VISIT.test(hook) || SITE_VISIT.test(input.body)) {
    throw new RuleError(
      "No site visits in first-touch.",
      "no_site_visits",
    );
  }

  if (!input.fleetCountsEnabled && (FLEET_COUNTS.test(hook) || FLEET_COUNTS.test(input.body))) {
    throw new RuleError(
      "Fleet counts are OFF. Remove truck/trailer headcount from first-touch.",
      "fleet_counts_off",
    );
  }

  if (!input.body.includes(PACKET_URL)) {
    throw new RuleError(
      `First-touch must include the packet URL ${PACKET_URL}`,
      "missing_packet",
    );
  }
}

export function requirePublishedEmail(
  email: string | null | undefined,
  action = "Send",
): string {
  const onFile = displayEmail(email);
  if (!onFile) {
    throw new RuleError(
      `No email on file. Do not invent one. ${action} is blocked.`,
      "no_email_on_file",
    );
  }
  return onFile;
}

export function validateMarkSent(email: string | null | undefined): string {
  return requirePublishedEmail(email, "Mark sent");
}

export function mailtoHref(input: {
  to: string | null;
  subject: string;
  body: string;
}): string | null {
  const to = displayEmail(input.to);
  if (!to) return null;
  const q = new URLSearchParams({
    subject: input.subject,
    body: input.body,
  });
  return `mailto:${to}?${q.toString()}`;
}
