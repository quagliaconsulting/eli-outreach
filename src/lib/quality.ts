import { isNamedDecisionMaker, isSwitchboardContact } from "./leads";
import { normalizeEmail } from "./rules";
import type { Company, Contact, LeadQuality, LeadTier } from "./types";

const GENERIC_LOCALS = new Set([
  "shipping",
  "dispatch",
  "sales",
  "info",
  "office",
  "contact",
  "admin",
  "hello",
  "inquiries",
  "customerservice",
  "customer.service",
  "customer-service",
  "traffic",
  "warehouse",
  "receiving",
  "logistics",
  "ops",
  "operations",
  "team",
  "mail",
  "webmaster",
  "support",
  "help",
  "general",
  "frontdesk",
  "front.desk",
  "front-desk",
  "accounting",
  "billing",
  "orders",
  "orderentry",
  "order.entry",
  "purchasing",
  "procurement",
  "csr",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "marketing",
  "hr",
]);

const CORE_STATES = new Set(["GA", "FL", "NC", "TX"]);
const SOUTHEAST_STATES = new Set(["AL", "SC", "TN", "MS", "LA", "AR", "KY", "VA"]);
const MEXICO_STATES = new Set(["MX", "MEX", "MEXICO"]);

const STATE_ALIASES: Record<string, string> = {
  GEORGIA: "GA",
  FLORIDA: "FL",
  "NORTH CAROLINA": "NC",
  TEXAS: "TX",
  ALABAMA: "AL",
  "SOUTH CAROLINA": "SC",
  TENNESSEE: "TN",
  MISSISSIPPI: "MS",
  LOUISIANA: "LA",
  ARKANSAS: "AR",
  KENTUCKY: "KY",
  VIRGINIA: "VA",
};

const TRANSPORT_TITLE =
  /\b(transportation|traffic|shipping|logistics|distribution)\b/i;
const ADJACENT_TITLE =
  /\b(operations|plant|purchas\w*|procur\w*|warehouse|inbound|yard|production|supply chain|dc)\b/i;
const FLEET_OR_FREIGHT = /\b(fleet|freight)\b/i;
const EXEC_TITLE = /\b(vp|vice[ -]?president|director|chief|head of|president|owner)\b/i;
const MANAGER_TITLE = /\b(manager|mgr|lead|superintendent)\b/i;
const COORD_TITLE = /\b(coordinator|clerk|analyst|assistant|specialist|supervisor)\b/i;

const PRODUCE = /produce|packer|packing house|citrus|vegetable|fruit/i;
const FOOD_BEV = /\bfood\b|beverage|brewery|dairy|meat|poultry|grocery|cold storage|reefer/i;
const PAPER = /paper|corrugat|packaging|converting|carton/i;
const LUMBER = /lumber|timber|\bwood\b|sawmill|plywood/i;
const METALS = /metal|steel|aluminum|scrap|recycl|iron/i;
const MANUFACTURING = /manufactur|furniture|appliance|industrial|assembly/i;
const DROP_TRAILER = /drop[ -]?trailer/i;

export type QualitySource = Pick<Company, "industry" | "city" | "state" | "phone" | "website" | "notes">;
export type QualityContact = Pick<Contact, "first_name" | "last_name" | "title" | "phone" | "email">;

export type EmailQuality = "named" | "work" | "generic" | "none";
export type PersonKind = "transport" | "adjacent" | "named" | "switchboard" | "unnamed";
export type SeniorityKind = "exec_transport" | "manager_transport" | "exec" | "manager" | "coordinator" | "other" | "none";
export type GeoKind = "core" | "southeast" | "mexico" | "far" | "unknown";
export type IndustryKind = "freight" | "manufacturing" | "other" | "unknown";

function digitsOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function classifyEmail(
  email: string | null | undefined,
  firstName = "",
  lastName = "",
): EmailQuality {
  const normalized = normalizeEmail(email);
  if (!normalized) return "none";

  const local = normalized.split("@")[0] ?? "";
  const localCompact = compact(local);
  if (GENERIC_LOCALS.has(local) || GENERIC_LOCALS.has(localCompact)) return "generic";

  const first = firstName.trim().toLowerCase();
  const last = lastName.trim().toLowerCase();
  const firstCompact = compact(first);
  const lastCompact = compact(last);

  if (firstCompact.length >= 2 && (local.includes(first) || localCompact.includes(firstCompact))) {
    return "named";
  }
  if (lastCompact.length >= 2 && (local.includes(last) || localCompact.includes(lastCompact))) {
    return "named";
  }
  if (firstCompact && lastCompact.length >= 2) {
    const initialLast = `${firstCompact[0]}${lastCompact}`;
    const lastInitial = `${lastCompact}${firstCompact[0]}`;
    if (localCompact === initialLast || localCompact === lastInitial) return "named";
  }

  return "work";
}

export function classifyPerson(contact: QualityContact | null): PersonKind {
  if (!contact) return "unnamed";
  if (isSwitchboardContact(contact)) return "switchboard";
  if (!isNamedDecisionMaker(contact)) return "unnamed";

  const title = contact.title.trim();
  if (TRANSPORT_TITLE.test(title)) return "transport";
  if (ADJACENT_TITLE.test(title)) return "adjacent";
  if (FLEET_OR_FREIGHT.test(title)) return "transport";
  return "named";
}

export function classifySeniority(contact: QualityContact | null, person: PersonKind): SeniorityKind {
  if (!contact || person === "switchboard" || person === "unnamed") return "none";
  const title = contact.title.trim();
  const transport = person === "transport";
  if (EXEC_TITLE.test(title)) return transport ? "exec_transport" : "exec";
  if (MANAGER_TITLE.test(title)) return transport ? "manager_transport" : "manager";
  if (COORD_TITLE.test(title)) return "coordinator";
  return "other";
}

export function normalizeState(state: string | null | undefined): string {
  const raw = state?.trim() ?? "";
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  return STATE_ALIASES[upper] ?? upper;
}

export function classifyGeo(state: string | null | undefined, city: string | null | undefined): GeoKind {
  const code = normalizeState(state);
  if (CORE_STATES.has(code)) return "core";
  if (SOUTHEAST_STATES.has(code)) return "southeast";
  if (MEXICO_STATES.has(code) || /mexico/i.test(city ?? "") || /mexico/i.test(state ?? "")) {
    return "mexico";
  }
  if (code || (city ?? "").trim()) return "far";
  return "unknown";
}

export function classifyIndustry(industry: string | null | undefined, notes: string | null | undefined): IndustryKind {
  const text = `${industry ?? ""} ${notes ?? ""}`;
  if (!text.trim()) return "unknown";
  if (
    PRODUCE.test(text) ||
    FOOD_BEV.test(text) ||
    PAPER.test(text) ||
    LUMBER.test(text) ||
    METALS.test(text) ||
    (MANUFACTURING.test(text) && DROP_TRAILER.test(text))
  ) {
    return "freight";
  }
  if (MANUFACTURING.test(text)) return "manufacturing";
  return "other";
}

export function tierForScore(score: number): LeadTier {
  if (score >= 70) return "A";
  if (score >= 45) return "B";
  return "C";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function emailLabel(kind: EmailQuality, email: string | null): string {
  if (kind === "named") return "Named work email";
  if (kind === "work") return "Published work email";
  if (kind === "generic") {
    const local = (normalizeEmail(email) ?? "").split("@")[0] || "inbox";
    return `Generic ${local} inbox`;
  }
  return "No email on file";
}

function personLabel(contact: QualityContact | null, person: PersonKind): string {
  if (person === "switchboard") return "switchboard-only row";
  if (person === "unnamed") return "unnamed desk";
  const title = contact?.title.trim();
  if (title) return title;
  if (person === "transport") return "named transportation contact";
  if (person === "adjacent") return "named operations contact";
  return "named contact";
}

function geoLabel(company: QualitySource, geo: GeoKind): string | null {
  const place = [company.city.trim(), company.state.trim()].filter(Boolean).join(", ");
  if (geo === "core" || geo === "southeast") return place || "Southeast lane";
  if (geo === "mexico") return place || "Mexico lane";
  if (geo === "far") return place ? `far from ELI lanes (${place})` : "far from ELI lanes";
  return null;
}

function industryLabel(company: QualitySource, industry: IndustryKind): string | null {
  if (industry === "unknown") return null;
  const raw = company.industry.trim();
  if (industry === "freight") return raw ? `${raw} fit` : "freight-fit industry";
  if (industry === "manufacturing") return raw || "manufacturing";
  return raw || null;
}

function buildReason(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" · ");
}

export function scoreLead(company: QualitySource, contact: QualityContact | null): LeadQuality {
  const emailKind = classifyEmail(contact?.email ?? null, contact?.first_name ?? "", contact?.last_name ?? "");
  const person = classifyPerson(contact);
  const seniority = classifySeniority(contact, person);
  const geo = classifyGeo(company.state, company.city);
  const industry = classifyIndustry(company.industry, company.notes);

  let reachability = 0;
  if (emailKind === "named") reachability = 38;
  else if (emailKind === "work") reachability = 32;
  else if (emailKind === "generic") reachability = 20;
  else if (digitsOnly(contact?.phone) || digitsOnly(company.phone)) reachability = 8;

  let personPoints = 0;
  if (person === "transport") personPoints = 20;
  else if (person === "adjacent") personPoints = 12;
  else if (person === "named") personPoints = contact?.title.trim() ? 7 : 5;

  let seniorityPoints = 0;
  if (seniority === "exec_transport") seniorityPoints = 12;
  else if (seniority === "manager_transport") seniorityPoints = 9;
  else if (seniority === "exec") seniorityPoints = 7;
  else if (seniority === "manager") seniorityPoints = 5;
  else if (seniority === "coordinator") seniorityPoints = 3;
  else if (seniority === "other") seniorityPoints = 2;

  let completeness = 0;
  if (digitsOnly(contact?.phone)) completeness += 5;
  else if (digitsOnly(company.phone)) completeness += 2;
  if (company.city.trim()) completeness += 4;
  if ((company.website ?? "").trim()) completeness += 3;

  let geoPoints = 0;
  if (geo === "core") geoPoints = 10;
  else if (geo === "southeast") geoPoints = 7;
  else if (geo === "mexico") geoPoints = 5;

  let industryPoints = 0;
  if (industry === "freight") industryPoints = 8;
  else if (industry === "manufacturing") industryPoints = 4;
  else if (industry === "other") industryPoints = 1;

  const score = clampScore(
    reachability + personPoints + seniorityPoints + completeness + geoPoints + industryPoints,
  );

  return {
    score,
    tier: tierForScore(score),
    reason: buildReason([
      emailLabel(emailKind, contact?.email ?? null),
      personLabel(contact, person),
      geoLabel(company, geo),
      industryLabel(company, industry),
    ]),
  };
}
