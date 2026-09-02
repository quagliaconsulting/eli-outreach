import {
  LOCKED_FIRST_TOUCH_BODY,
  LOCKED_FIRST_TOUCH_SUBJECT,
} from "./constants";

export type TemplateVars = {
  company: string;
  firstName: string;
  hookLine: string;
  senderName: string;
  senderPhone: string;
};

export function fillLockedFirstTouch(vars: TemplateVars): {
  subject: string;
  body: string;
} {
  const hook = normalizeHook(vars.hookLine);
  const firstName = vars.firstName.trim() || "there";
  const replace = (text: string) =>
    text
      .replaceAll("{{Company}}", vars.company.trim())
      .replaceAll("{{FirstName}}", firstName)
      .replaceAll("{{hook_line}}", hook)
      .replaceAll("{{SenderName}}", vars.senderName.trim())
      .replaceAll("{{SenderPhone}}", vars.senderPhone.trim());

  return {
    subject: replace(LOCKED_FIRST_TOUCH_SUBJECT),
    body: replace(LOCKED_FIRST_TOUCH_BODY),
  };
}

export function normalizeHook(hookLine: string): string {
  const trimmed = hookLine.trim().replace(/\s+/g, " ");
  return trimmed.replace(/\.+$/, "");
}

export function isLockedFirstTouch(
  subject: string,
  body: string,
  vars: TemplateVars,
): boolean {
  const expected = fillLockedFirstTouch(vars);
  return (
    normalizeWhitespace(subject) === normalizeWhitespace(expected.subject) &&
    normalizeWhitespace(body) === normalizeWhitespace(expected.body)
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}
