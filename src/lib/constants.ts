export const TIMEZONE = "America/New_York";
export const FROM_EMAIL = "max@elbertalogistics.net";
export const REPLY_TO_EMAIL = "max@elbertalogistics.net";
export const PACKET_URL = "https://elbertalogistics.com/services/";
export const DEFAULT_SENDER_NAME = "Max";
export const DEFAULT_SENDER_PHONE = "850-702-9224";

export const PIPELINE_COLUMNS = ["working", "next_up", "backfill"] as const;
export type PipelineColumn = (typeof PIPELINE_COLUMNS)[number];

export const COMPANY_STAGES = [
  "working",
  "next_up",
  "backfill",
  "replied",
  "closed",
  "dnc",
] as const;
export type CompanyStage = (typeof COMPANY_STAGES)[number];

export const NEXT_ACTION_TYPES = ["call", "email", "follow_up", "none"] as const;
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number];

export const DRAFT_STATUSES = [
  "draft",
  "approved",
  "copied",
  "sent",
  "blocked",
] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const LOCKED_FIRST_TOUCH_SUBJECT =
  "{{Company}} truckload capacity — 15 minutes?";

export const LOCKED_FIRST_TOUCH_BODY = `Hi {{FirstName}},
I am with Elberta Logistics International (ELI). We are an asset-based carrier and a freight brokerage — company trucks plus partner capacity — covering the 48 states, Canada, and Mexico.
I am reaching out because {{hook_line}}.
We also handle warehousing, drop trailer / trailer rental, drayage, and ocean when that is useful. Services overview: ${PACKET_URL}
Would you have 15 minutes this week for a short intro on how you move freight today and whether ELI is even relevant? Happy to work around your calendar.
Best,
{{SenderName}}
Business Development
Elberta Logistics International
{{SenderPhone}}`;

export const OPS_RULES = [
  {
    id: "no-send",
    title: "Never send email from this console",
    detail:
      "No SMTP, Gmail, or any outbound mail. Approve, copy, and mark sent only.",
  },
  {
    id: "no-invent-email",
    title: "Never invent emails",
    detail:
      "If a contact has no email on file, leave it blank. Phone first.",
  },
  {
    id: "crm-after-replied",
    title: "CRM only after Replied",
    detail: "Do not open a CRM record until the account status is Replied.",
  },
  {
    id: "dnc-blocks",
    title: "DNC blocks first-touch",
    detail:
      "A matching DNC company, contact, email, or phone cannot receive first-touch.",
  },
  {
    id: "fleet-off",
    title: "Fleet counts default OFF",
    detail:
      "Do not cite truck or trailer counts unless Settings enables fleet counts.",
  },
  {
    id: "no-ltl-lead",
    title: "No LTL lead",
    detail: "First-touch leads with truckload capacity, never LTL.",
  },
  {
    id: "no-site-visits",
    title: "No site visits in first-touch",
    detail: "Do not offer to visit a facility in a first-touch draft.",
  },
  {
    id: "phone-first",
    title: "Phone-first",
    detail: "Today’s queue ranks calls ahead of email copy work.",
  },
  {
    id: "from-reply",
    title: "From / Reply-To locked",
    detail: `${FROM_EMAIL} — not editable.`,
  },
  {
    id: "timezone",
    title: "Timezone",
    detail: TIMEZONE,
  },
] as const;
