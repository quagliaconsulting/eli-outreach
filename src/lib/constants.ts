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

export const LOCKED_FIRST_TOUCH_SIGNATURE = `Thanks,

Maxwell Bacon
Director of Customer Sales, Elberta Logistics
${LOCKED_SENDER_OFFICE}
${LOCKED_SENDER_CELL}`;

export const LOCKED_FIRST_TOUCH_TEMPLATES: Record<
  FirstTouchVertical,
  { subject: string; body: string }
> = {
  food_beverage: {
    subject: "Temperature-controlled freight for {{Company}}",
    body: `Hello {{FirstName}},

This is Max with Elberta Logistics. We move food and beverage freight for shippers like Perdue, Tillamook, Reser's Fine Foods and Dole Fresh. That's everything from frozen ice cream at -20°F to fresh produce at 36°F.

We know the cold chain, the delivery windows and the rejection risk that come with that freight, and we build capacity around it.

Would you have a few minutes for a quick intro on your temperature-controlled lanes?`,
  },
  raw_materials: {
    subject: "Coil and tubing freight for {{Company}}",
    body: `Hello {{FirstName}},

Max Bacon here with Elberta Logistics. We haul steel and aluminum for producers like Gerdau, Constellium and Reliance, mostly coils and tubing.

That freight needs the right securement, weight handling and equipment, and we have the carrier network for it.

If you're moving coil or tubing, would you be open to a short call?`,
  },
  chemical: {
    subject: "Hazmat and solvent freight for {{Company}}",
    body: `Hello {{FirstName}},

This is Max Bacon with Elberta Logistics. We work with chemical and coatings companies such as Sherwin-Williams, AkzoNobel and Trinseo on hazardous materials, solvents and paint-related products.

Compliance, documentation and carrier vetting are part of every shipment.

If you've got a few minutes, I'd like a quick intro on how you're covering that freight.`,
  },
  manufacturing: {
    subject: "Manufacturing freight support for {{Company}}",
    body: `Hello {{FirstName}},

Max with Elberta Logistics. We support manufacturers on the automotive side, including Adient, Flex-N-Gate and OpMobility, and on building products, including Woodgrain, Stella-Jones and Weyerhaeuser.

Those operations depend on freight arriving on time and intact, so we plan capacity around production schedules.

Would you be open to a short intro to talk through your lanes?`,
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
