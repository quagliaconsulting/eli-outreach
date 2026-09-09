export const TIMEZONE = "America/New_York";
export const FROM_EMAIL = "max@elbertalogistics.net";
export const REPLY_TO_EMAIL = "max@elbertalogistics.net";
export const PACKET_URL = "https://elbertalogistics.com/services/";
export const DEFAULT_SENDER_NAME = "Maxwell Bacon";
export const DEFAULT_SENDER_PHONE = "248-318-6170";
export const LOCKED_SENDER_OFFICE = "850-692-2511 x 148";
export const LOCKED_SENDER_CELL = "248-318-6170";

export const FIRST_TOUCH_VERTICALS = [
  "food_beverage",
  "raw_materials",
  "chemical",
  "manufacturing",
] as const;
export type FirstTouchVertical = (typeof FIRST_TOUCH_VERTICALS)[number];

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

export const LOCKED_FIRST_TOUCH_SIGNATURE = `Thank you,

Maxwell Bacon
Director of Customer Sales, Elberta Logistics International Solutions LLC
${LOCKED_SENDER_OFFICE}
${LOCKED_SENDER_CELL}`;

export const LOCKED_FIRST_TOUCH_TEMPLATES: Record<
  FirstTouchVertical,
  { subject: string; body: string }
> = {
  food_beverage: {
    subject: "Temperature-controlled freight for {{Company}}",
    body: `I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with food and beverage shippers such as Perdue, Tillamook, Reser's Fine Foods and Dole Fresh, moving everything from frozen ice cream at -20°F to fresh produce at 36°F.

We understand the cold chain, the delivery windows and the rejection risk that come with your products, and we build our capacity around them.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?`,
  },
  raw_materials: {
    subject: "Coil and tubing freight for {{Company}}",
    body: `I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with steel and aluminum producers such as Gerdau, Constellium and Reliance, transporting aluminum and steel coils and tubing.

We know the securement, weight and equipment requirements this freight demands, and we have the carrier network to handle it reliably.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?`,
  },
  chemical: {
    subject: "Hazmat and solvent freight for {{Company}}",
    body: `I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with chemical and coatings companies such as Sherwin-Williams, AkzoNobel and Trinseo, transporting hazardous materials, solvents and paint-related products.

We understand the compliance, documentation and carrier vetting that hazmat freight requires, and we manage it as part of every shipment.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?`,
  },
  manufacturing: {
    subject: "Manufacturing freight support for {{Company}}",
    body: `I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We support manufacturers on both the automotive side, including Adient, Flex-N-Gate and OpMobility, and the building products side, including Woodgrain, Stella-Jones and Weyerhaeuser.

We know how much your operations depend on freight arriving on time and intact, and we plan our capacity around your production schedules.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?`,
  },
};

export const LOCKED_FIRST_TOUCH_SUBJECT =
  LOCKED_FIRST_TOUCH_TEMPLATES.manufacturing.subject;

export const LOCKED_FIRST_TOUCH_BODY =
  LOCKED_FIRST_TOUCH_TEMPLATES.manufacturing.body;

export const OPS_RULES = [
  {
    id: "no-send",
    title: "Send only when SMTP is enabled",
    detail:
      "Approve sends first-touch via Namecheap SMTP only when SEND_ENABLED and SMTP_PASS are set. Otherwise copy-only. Never invent emails. Never send as sales@.",
  },
  {
    id: "no-invent-email",
    title: "Never invent emails",
    detail:
      "If a contact has no email on file, leave it blank. Do not invent an address.",
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
    detail: "First-touch leads with truckload capacity, never LTL. Use Max's locked vertical copy.",
  },
  {
    id: "no-site-visits",
    title: "No site visits in first-touch",
    detail: "Do not offer to visit a facility in a first-touch draft.",
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
