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

const GENERIC_FIRST_NAMES = new Set([
  "accounting",
  "admin",
  "assistant",
  "billing",
  "clerk",
  "contact",
  "coordinator",
  "csr",
  "customer",
  "customerservice",
  "department",
  "dept",
  "desk",
  "director",
  "dispatch",
  "frontdesk",
  "general",
  "help",
  "inbox",
  "info",
  "inquiries",
  "logistics",
  "mailbox",
  "manager",
  "na",
  "n/a",
  "none",
  "office",
  "operations",
  "ops",
  "orders",
  "procurement",
  "purchasing",
  "receiving",
  "sales",
  "service",
  "services",
  "shipping",
  "shippingdesk",
  "support",
  "tbd",
  "team",
  "traffic",
  "unknown",
  "warehouse",
]);

const STRONG_DEPT_TOKENS = new Set([
  "department",
  "dept",
  "desk",
  "dispatch",
  "logistics",
  "receiving",
  "sales",
  "shipping",
  "team",
  "traffic",
  "warehouse",
]);

const PERSON_NAME_TOKEN = /^[A-Za-z][A-Za-z.''-]*$/;
const EMAIL_LOCAL_PART = /^[A-Za-z]{2,}\.[A-Za-z]{2,}$/;

function compactName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleCaseName(raw: string): string {
  return raw
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((hyphenPart) =>
          hyphenPart
            .split("'")
            .map((part) =>
              part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
            )
            .join("'"),
        )
        .join("-"),
    )
    .join(" ");
}

function formatGreetingName(raw: string): string {
  if (raw === raw.toUpperCase() || raw === raw.toLowerCase()) {
    return titleCaseName(raw);
  }
  return raw;
}

/** Real person first name from the contact record, or null for a desk / department label. */
export function personFirstName(firstName?: string | null): string | null {
  const raw = (firstName ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return null;
  if (/[0-9@_/\\:]/.test(raw)) return null;
  if (EMAIL_LOCAL_PART.test(raw)) return null;

  const lower = raw.toLowerCase();
  if (GENERIC_FIRST_NAMES.has(lower) || GENERIC_FIRST_NAMES.has(compactName(raw))) return null;

  const tokens = lower.split(/[\s/&,]+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 3) return null;
  if (tokens.some((token) => STRONG_DEPT_TOKENS.has(token))) return null;
  if (tokens.every((token) => GENERIC_FIRST_NAMES.has(token) || token === "and" || token === "the" || token === "of")) {
    return null;
  }

  const originalTokens = raw.split(/\s+/);
  if (!originalTokens.every((token) => PERSON_NAME_TOKEN.test(token))) return null;

  return formatGreetingName(raw);
}

export function firstTouchGreeting(firstName?: string | null): string {
  const name = personFirstName(firstName);
  return name ? `Hello ${name},` : "Hello,";
}

function applyFirstName(text: string, firstName?: string | null): string {
  const name = personFirstName(firstName);
  if (name) return text.replaceAll("{{FirstName}}", name);
  return text.replaceAll("Hello {{FirstName}},", "Hello,").replaceAll("{{FirstName}}", "");
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
    body: `${applyFirstName(applyCompany(template.body, vars.company), vars.firstName)}\n\n${LOCKED_FIRST_TOUCH_SIGNATURE}`,
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
