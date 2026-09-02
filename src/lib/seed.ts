import type Database from "better-sqlite3";
import { nowIso } from "./clock";
import { fillLockedFirstTouch } from "./templates";
import {
  DEFAULT_SENDER_NAME,
  DEFAULT_SENDER_PHONE,
} from "./constants";

type SeedCompany = {
  name: string;
  industry: string;
  city: string;
  state: string;
  phone: string | null;
  website: string | null;
  notes: string;
  stage: string;
  next_action_type: "call" | "email" | "follow_up" | "none";
  next_action_at: string | null;
  contacts: {
    first_name: string;
    last_name: string;
    title: string;
    phone: string | null;
    email: string | null;
    is_primary: number;
  }[];
  dncReason?: string;
  draft?: { hook: string; status: "draft" | "approved" | "blocked" };
  repliedCrm?: { freight_profile: string; decision_notes: string };
};

const SEED: SeedCompany[] = [
  {
    name: "Pinecrest Produce Co.",
    industry: "Produce / food",
    city: "Bainbridge",
    state: "GA",
    phone: "229-555-0142",
    website: null,
    notes: "Seasonal outbound produce. Phone-first — email on file is example.com only.",
    stage: "working",
    next_action_type: "call",
    next_action_at: "2026-09-02",
    contacts: [
      {
        first_name: "Elena",
        last_name: "Vargas",
        title: "Transportation Manager",
        phone: "229-555-0142",
        email: "elena.vargas@example.com",
        is_primary: 1,
      },
    ],
    draft: {
      hook: "you move produce out of south Georgia and likely need dry van and reefer truckload coverage into the Southeast",
      status: "draft",
    },
  },
  {
    name: "Flint River Packaging",
    industry: "Packaging",
    city: "Albany",
    state: "GA",
    phone: "229-555-0188",
    website: null,
    notes: "No email on file. Do not invent one. Call the board.",
    stage: "working",
    next_action_type: "call",
    next_action_at: "2026-09-02",
    contacts: [
      {
        first_name: "Marcus",
        last_name: "Hale",
        title: "Shipping Supervisor",
        phone: "229-555-0188",
        email: null,
        is_primary: 1,
      },
    ],
  },
  {
    name: "Harborline Imports",
    industry: "Import distribution",
    city: "Jacksonville",
    state: "FL",
    phone: "904-555-0160",
    website: null,
    notes: "Drayage + inland truckload from JAX. Packet only after intro.",
    stage: "working",
    next_action_type: "call",
    next_action_at: "2026-09-03",
    contacts: [
      {
        first_name: "Priya",
        last_name: "Nandakumar",
        title: "Import Operations",
        phone: "904-555-0160",
        email: "priya.n@example.com",
        is_primary: 1,
      },
    ],
    draft: {
      hook: "you pull containers through Jacksonville and then need inland truckload, not a brokerage-only pitch",
      status: "approved",
    },
  },
  {
    name: "Cypress Cold Storage",
    industry: "Cold storage",
    city: "Tampa",
    state: "FL",
    phone: "813-555-0119",
    website: null,
    notes: "Reefer truckload. Do not lead LTL. Do not offer a site visit.",
    stage: "working",
    next_action_type: "call",
    next_action_at: "2026-09-02",
    contacts: [
      {
        first_name: "Jonah",
        last_name: "Whitaker",
        title: "Warehouse Director",
        phone: "813-555-0119",
        email: null,
        is_primary: 1,
      },
    ],
  },
  {
    name: "Oakridge Furniture Works",
    industry: "Furniture manufacturing",
    city: "Hickory",
    state: "NC",
    phone: "828-555-0174",
    website: null,
    notes: "Outbound truckload to DC/retail. Next up after this week's working set.",
    stage: "next_up",
    next_action_type: "call",
    next_action_at: "2026-09-08",
    contacts: [
      {
        first_name: "Claire",
        last_name: "Benedetti",
        title: "Logistics Lead",
        phone: "828-555-0174",
        email: "claire.b@example.com",
        is_primary: 1,
      },
    ],
  },
  {
    name: "Sunbelt Beverage Distributors",
    industry: "Beverage",
    city: "Orlando",
    state: "FL",
    phone: "407-555-0133",
    website: null,
    notes: "Phone only. No email on file.",
    stage: "next_up",
    next_action_type: "call",
    next_action_at: "2026-09-09",
    contacts: [
      {
        first_name: "Andre",
        last_name: "Simmons",
        title: "Fleet Coordinator",
        phone: "407-555-0133",
        email: null,
        is_primary: 1,
      },
    ],
  },
  {
    name: "Red Clay Building Supply",
    industry: "Building materials",
    city: "Atlanta",
    state: "GA",
    phone: "404-555-0190",
    website: null,
    notes: "Flatbed / dry van mix. Research lanes before first-touch.",
    stage: "next_up",
    next_action_type: "follow_up",
    next_action_at: "2026-09-10",
    contacts: [
      {
        first_name: "Denise",
        last_name: "Okoye",
        title: "Purchasing / inbound freight",
        phone: "404-555-0190",
        email: "denise.okoye@example.com",
        is_primary: 1,
      },
    ],
  },
  {
    name: "Coastal Cotton Goods",
    industry: "Textiles",
    city: "Savannah",
    state: "GA",
    phone: "912-555-0155",
    website: null,
    notes: "Backfill. Ocean mention is fine as a secondary service, not the lead.",
    stage: "backfill",
    next_action_type: "none",
    next_action_at: null,
    contacts: [
      {
        first_name: "Hannah",
        last_name: "Reeves",
        title: "Supply Chain Analyst",
        phone: "912-555-0155",
        email: "hannah.reeves@example.com",
        is_primary: 1,
      },
    ],
  },
  {
    name: "Blue Ridge Appliance",
    industry: "Appliances",
    city: "Asheville",
    state: "NC",
    phone: "828-555-0121",
    website: null,
    notes: "Backfill. Dedicated / truckload only if they confirm volume.",
    stage: "backfill",
    next_action_type: "none",
    next_action_at: null,
    contacts: [
      {
        first_name: "Theo",
        last_name: "Grant",
        title: "DC Manager",
        phone: null,
        email: null,
        is_primary: 1,
      },
    ],
  },
  {
    name: "Ironwood Steel Supply",
    industry: "Metals",
    city: "Birmingham",
    state: "AL",
    phone: "205-555-0144",
    website: null,
    notes: "Flatbed candidate. Keep in backfill until a hook is real.",
    stage: "backfill",
    next_action_type: "none",
    next_action_at: null,
    contacts: [
      {
        first_name: "Luis",
        last_name: "Carrera",
        title: "Yard Superintendent",
        phone: "205-555-0144",
        email: null,
        is_primary: 1,
      },
    ],
  },
  {
    name: "Gulfstream Marine Parts",
    industry: "Marine parts",
    city: "Mobile",
    state: "AL",
    phone: "251-555-0177",
    website: null,
    notes: "Replied. CRM unlocked. Do not keep pitching first-touch.",
    stage: "replied",
    next_action_type: "follow_up",
    next_action_at: "2026-09-04",
    contacts: [
      {
        first_name: "Nina",
        last_name: "Patterson",
        title: "Director of Logistics",
        phone: "251-555-0177",
        email: "nina.patterson@example.com",
        is_primary: 1,
      },
    ],
    repliedCrm: {
      freight_profile:
        "EXAMPLE DATA: inbound ocean parts to Mobile, then truckload to Gulf dealers. Equipment: dry van. Volume unconfirmed.",
      decision_notes:
        "EXAMPLE DATA: Nina replied and asked for a 15-minute intro Thursday ET. CRM opened only after Replied.",
    },
  },
  {
    name: "Magnolia Paper Converting",
    industry: "Paper converting",
    city: "Tallahassee",
    state: "FL",
    phone: "850-555-0108",
    website: null,
    notes: "On DNC. First-touch is blocked.",
    stage: "dnc",
    next_action_type: "none",
    next_action_at: null,
    contacts: [
      {
        first_name: "Robert",
        last_name: "Keene",
        title: "Owner",
        phone: "850-555-0108",
        email: "robert.keene@example.com",
        is_primary: 1,
      },
    ],
    dncReason: "Asked not to be contacted — EXAMPLE DATA",
  },
];

export function seedIfEmpty(db: Database.Database): void {
  const row = db.prepare("SELECT COUNT(*) AS n FROM companies").get() as { n: number };
  if (row.n > 0) return;

  const now = nowIso();
  const insertCompany = db.prepare(
    `INSERT INTO companies (
      name, industry, city, state, phone, website, notes, stage, is_example,
      next_action_type, next_action_at, last_touch_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL, ?, ?)`,
  );
  const insertContact = db.prepare(
    `INSERT INTO contacts (
      company_id, first_name, last_name, title, phone, email, is_primary, is_example
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  const insertDnc = db.prepare(
    `INSERT INTO dnc (company_id, contact_id, company_name, email, phone, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertDraft = db.prepare(
    `INSERT INTO drafts (
      company_id, contact_id, kind, subject, body, hook_line, status,
      blocked_reason, created_at, approved_at, copied_at, sent_at
    ) VALUES (?, ?, 'first_touch', ?, ?, ?, ?, NULL, ?, ?, NULL, NULL)`,
  );
  const insertCrm = db.prepare(
    `INSERT INTO crm_records (company_id, freight_profile, decision_notes, next_meeting_at, created_at, updated_at)
     VALUES (?, ?, ?, '2026-09-04T15:00:00.000Z', ?, ?)`,
  );
  const insertActivity = db.prepare(
    `INSERT INTO activities (company_id, contact_id, type, notes, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const company of SEED) {
      const companyId = Number(
        insertCompany.run(
          company.name,
          company.industry,
          company.city,
          company.state,
          company.phone,
          company.website,
          company.notes,
          company.stage,
          company.next_action_type,
          company.next_action_at,
          now,
          now,
        ).lastInsertRowid,
      );

      let primaryId = 0;
      for (const contact of company.contacts) {
        const contactId = Number(
          insertContact.run(
            companyId,
            contact.first_name,
            contact.last_name,
            contact.title,
            contact.phone,
            contact.email,
            contact.is_primary,
          ).lastInsertRowid,
        );
        if (contact.is_primary) primaryId = contactId;
      }

      if (company.dncReason) {
        const contact = company.contacts[0];
        insertDnc.run(
          companyId,
          primaryId,
          company.name,
          contact.email,
          contact.phone,
          company.dncReason,
          now,
        );
        insertActivity.run(
          companyId,
          primaryId,
          "dnc",
          company.dncReason,
          now,
        );
      }

      if (company.draft && primaryId) {
        const rendered = fillLockedFirstTouch({
          company: company.name,
          firstName: company.contacts[0].first_name,
          hookLine: company.draft.hook,
          senderName: DEFAULT_SENDER_NAME,
          senderPhone: DEFAULT_SENDER_PHONE,
        });
        insertDraft.run(
          companyId,
          primaryId,
          rendered.subject,
          rendered.body,
          company.draft.hook,
          company.draft.status,
          now,
          company.draft.status === "approved" ? now : null,
        );
      }

      if (company.repliedCrm) {
        insertCrm.run(
          companyId,
          company.repliedCrm.freight_profile,
          company.repliedCrm.decision_notes,
          now,
          now,
        );
        insertActivity.run(
          companyId,
          primaryId,
          "replied",
          "EXAMPLE DATA: marked Replied — CRM unlocked.",
          now,
        );
      }
    }
  });

  tx();
}
