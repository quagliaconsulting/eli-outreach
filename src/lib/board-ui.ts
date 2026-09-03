import { FROM_EMAIL, REPLY_TO_EMAIL } from "./constants";

/** Prefer the live contact email. Never invent an address. */
export function publishedLeadEmail(
  contactEmail: string | null | undefined,
  draftContactEmail?: string | null | undefined,
): string | null {
  const preferred = contactEmail?.trim() || draftContactEmail?.trim() || "";
  return preferred || null;
}

export function formatCopiedDraft(input: {
  subject: string;
  body: string;
  contactEmail?: string | null;
  draftContactEmail?: string | null;
}): string {
  const email = publishedLeadEmail(input.contactEmail, input.draftContactEmail);
  const to = email || "(no email on file — do not invent)";
  return `From: ${FROM_EMAIL}\nReply-To: ${REPLY_TO_EMAIL}\nTo: ${to}\nSubject: ${input.subject}\n\n${input.body}`;
}

export function approveDisabledTitle(input: {
  send: boolean;
  status: string;
  email: string | null | undefined;
}): string | undefined {
  if (input.send && input.status === "draft" && !input.email) {
    return "No email on file — cannot send";
  }
  return undefined;
}

/**
 * Phone-only drafts must not render a loud red stamp. EmailOnFile plus the
 * Approve tooltip already explain that send is blocked.
 */
export function shouldShowApproveDisabledStamp(_input: {
  send: boolean;
  status: string;
  email: string | null | undefined;
}): boolean {
  return false;
}

export function setDraftActionError(
  current: Record<number, string>,
  draftId: number,
  message: string,
): Record<number, string> {
  return { ...current, [draftId]: message };
}

export function clearDraftActionError(
  current: Record<number, string>,
  draftId: number,
): Record<number, string> {
  if (!(draftId in current)) return current;
  const next = { ...current };
  delete next[draftId];
  return next;
}
