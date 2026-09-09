import {
  LOCKED_FIRST_TOUCH_SIGNATURE,
  LOCKED_FIRST_TOUCH_TEMPLATES,
  type FirstTouchVertical,
} from "./constants";

export type TemplateVars = {
  company: string;
  industry?: string | null;
  notes?: string | null;
  name?: string | null;
  firstName?: string;
  hookLine?: string;
  senderName?: string;
  senderPhone?: string;
};

export type VerticalHints = {
  name?: string | null;
  notes?: string | null;
};

const CHEMICAL =
  /\b(chemicals?|coatings?|solvents?|hazmat|hazardous|paints?|resins?|adhesives?)\b|heat[- ]treat(?:ing)?(?:\s+chem)/i;
const FOOD_BEVERAGE =
  /\b(foods?|beverage|produce|dairy|meat|poultry|grocery|frozen|seafood|bakery|brewery|winery|distiller(?:y|ies)?|confection|snack|perishable|citrus|vegetable|fruit|bottl\w*)\b|cold[ -]?storage|ice[ -]?cream|packing house|packer|reefer/i;
const RAW_MATERIALS =
  /\b(coils?|tubing|tubes?|scrap|steels?|alumin(?:um|ium)|metals?|billets?|rods?)\b|service center|metal service/i;

function classifierText(
  industry: string | null | undefined,
  hints: VerticalHints = {},
): string {
  return [industry, hints.name, hints.notes]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function selectVertical(
  industry: string | null | undefined,
  hints: VerticalHints = {},
): FirstTouchVertical {
  const text = classifierText(industry, hints);
  if (!text) return "manufacturing";
  if (CHEMICAL.test(text)) return "chemical";
  if (FOOD_BEVERAGE.test(text)) return "food_beverage";
  if (RAW_MATERIALS.test(text)) return "raw_materials";
  return "manufacturing";
}

function applyCompany(text: string, company: string): string {
  return text.replaceAll("{{Company}}", company.trim());
}

export function fillLockedFirstTouch(vars: TemplateVars): {
  subject: string;
  body: string;
  vertical: FirstTouchVertical;
} {
  const vertical = selectVertical(vars.industry, {
    name: vars.name ?? vars.company,
    notes: vars.notes,
  });
  const template = LOCKED_FIRST_TOUCH_TEMPLATES[vertical];
  return {
    subject: applyCompany(template.subject, vars.company),
    body: `${applyCompany(template.body, vars.company)}\n\n${LOCKED_FIRST_TOUCH_SIGNATURE}`,
    vertical,
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
