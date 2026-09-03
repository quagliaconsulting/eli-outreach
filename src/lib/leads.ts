import { validateFirstTouchContent } from "./rules";
import { fillLockedFirstTouch, normalizeHook } from "./templates";
import type { CompanyWithContacts, Contact } from "./types";

const SWITCHBOARD_FIRST_NAMES = new Set(["shipping"]);

const SAFE_FALLBACK_HOOK =
  "you may need dry van truckload coverage from an asset-based carrier";

export function isSwitchboardContact(contact: Pick<Contact, "first_name" | "last_name">): boolean {
  const first = contact.first_name.trim().toLowerCase();
  const last = contact.last_name.trim();
  return SWITCHBOARD_FIRST_NAMES.has(first) && last.length === 0;
}

export function isNamedDecisionMaker(contact: Pick<Contact, "first_name" | "last_name">): boolean {
  const first = contact.first_name.trim();
  if (!first) return false;
  return !isSwitchboardContact(contact);
}

export function namedContact(company: Pick<CompanyWithContacts, "contacts">): Contact | undefined {
  const named = company.contacts.filter(isNamedDecisionMaker);
  return named.find((contact) => contact.is_primary) ?? named[0];
}

export function sanitizeNotesForHook(notes: string): string {
  return notes
    .replace(/phone[- ]first[^.!?]*/gi, " ")
    .replace(/do not invent[^.!?]*/gi, " ")
    .replace(/call (the board|before you|first)[^.!?]*/gi, " ")
    .replace(/no email on file[^.!?]*/gi, " ")
    .replace(/example data[^.!?]*/gi, " ")
    .replace(/\bon dnc\b[^.!?]*/gi, " ")
    .replace(/crm (is )?(now )?(unlocked|locked|open)[^.!?]*/gi, " ")
    .replace(/keep crm locked[^.!?]*/gi, " ")
    .replace(/[.!?]+/g, ".")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? text).trim();
}

function hookIsLegal(hook: string): boolean {
  if (hook.trim().length < 12) return false;
  try {
    const rendered = fillLockedFirstTouch({
      company: "Hook Check",
      firstName: "Test",
      hookLine: hook,
      senderName: "Max",
      senderPhone: "850-702-9224",
    });
    validateFirstTouchContent({
      hookLine: hook,
      subject: rendered.subject,
      body: rendered.body,
      fleetCountsEnabled: false,
    });
    return true;
  } catch {
    return false;
  }
}

export function buildFirstTouchHook(input: {
  notes?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const cleaned = sanitizeNotesForHook(input.notes ?? "");
  const fromNotes = [firstSentence(cleaned), cleaned].filter(Boolean);
  for (const candidate of fromNotes) {
    const hook = normalizeHook(candidate);
    if (hookIsLegal(hook)) return hook;
  }

  const industry = input.industry?.trim();
  const place = [input.city?.trim(), input.state?.trim()].filter(Boolean).join(", ");
  const fallbacks = [
    industry && place
      ? `you work in ${industry} in ${place} and may need truckload coverage`
      : null,
    place ? `you ship from ${place} and may need truckload coverage` : null,
    industry ? `you work in ${industry} and may need truckload coverage` : null,
    SAFE_FALLBACK_HOOK,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of fallbacks) {
    const hook = normalizeHook(candidate);
    if (hookIsLegal(hook)) return hook;
  }

  return SAFE_FALLBACK_HOOK;
}
