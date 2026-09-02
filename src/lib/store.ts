import type { Database } from "better-sqlite3";
import { nowIso } from "./clock";
import {
  COMPANY_STAGES,
  FROM_EMAIL,
  PACKET_URL,
  PIPELINE_COLUMNS,
  REPLY_TO_EMAIL,
  TIMEZONE,
  type CompanyStage,
} from "./constants";
import { getDb } from "./db";
import {
  assertRealEmail,
  displayEmail,
  normalizeEmail,
  normalizePhone,
  validateFirstTouchContent,
  validateMarkSent,
} from "./rules";
import { fillLockedFirstTouch, isLockedFirstTouch } from "./templates";
import {
  RuleError,
  type Activity,
  type Company,
  type CompanyWithContacts,
  type Contact,
  type CrmRecord,
  type DncEntry,
  type Draft,
  type DraftView,
  type Settings,
} from "./types";

function db(): Database {
  return getDb();
}

export function getSettings(): Settings {
  return db().prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
}

export function updateSettings(input: {
  sender_name?: string;
  sender_phone?: string;
  fleet_counts_enabled?: boolean;
}): Settings {
  const current = getSettings();
  const sender_name = input.sender_name?.trim() || current.sender_name;
  const sender_phone = input.sender_phone?.trim() || current.sender_phone;
  const fleet_counts_enabled = input.fleet_counts_enabled ? 1 : 0;

  db()
    .prepare(
      `UPDATE settings SET
        sender_name = ?,
        sender_phone = ?,
        fleet_counts_enabled = ?,
        sender_email = ?,
        reply_to_email = ?,
        timezone = ?,
        packet_url = ?
      WHERE id = 1`,
    )
    .run(
      sender_name,
      sender_phone,
      fleet_counts_enabled,
      FROM_EMAIL,
      REPLY_TO_EMAIL,
      TIMEZONE,
      PACKET_URL,
    );

  return getSettings();
}

export function listCompanies(): CompanyWithContacts[] {
  const companies = db()
    .prepare("SELECT * FROM companies ORDER BY name COLLATE NOCASE")
    .all() as Company[];
  return companies.map(hydrateCompany);
}

export function getCompany(id: number): CompanyWithContacts {
  const company = db().prepare("SELECT * FROM companies WHERE id = ?").get(id) as
    | Company
    | undefined;
  if (!company) throw new RuleError("Company not found.", "not_found");
  return hydrateCompany(company);
}

function hydrateCompany(company: Company): CompanyWithContacts {
  const contacts = db()
    .prepare("SELECT * FROM contacts WHERE company_id = ? ORDER BY is_primary DESC, id")
    .all(company.id) as Contact[];
  const crm =
    (db()
      .prepare("SELECT * FROM crm_records WHERE company_id = ?")
      .get(company.id) as CrmRecord | undefined) ?? null;
  return {
    ...company,
    contacts,
    dnc: isCompanyDnc(company, contacts),
    crm,
  };
}

export function updateCompanyStage(id: number, stage: CompanyStage): CompanyWithContacts {
  if (!COMPANY_STAGES.includes(stage)) {
    throw new RuleError("Unknown stage.", "bad_stage");
  }
  const company = getCompany(id);
  if (stage !== "dnc" && isCompanyDnc(company, company.contacts) && PIPELINE_COLUMNS.includes(stage as (typeof PIPELINE_COLUMNS)[number])) {
    throw new RuleError("DNC account cannot return to the live pipeline.", "dnc_blocks_pipeline");
  }
  const now = nowIso();
  db()
    .prepare("UPDATE companies SET stage = ?, updated_at = ? WHERE id = ?")
    .run(stage, now, id);
  logActivity(id, null, "stage_change", `Stage set to ${stage}`);
  if (stage === "replied") {
    logActivity(id, null, "replied", "Marked Replied. CRM is now allowed.");
  }
  return getCompany(id);
}

export function addContact(
  companyId: number,
  input: {
    first_name: string;
    last_name: string;
    title?: string;
    phone?: string | null;
    email?: string | null;
  },
): Contact {
  const email = assertRealEmail(input.email ?? null);
  const phone = input.phone?.trim() || null;
  const first = input.first_name.trim();
  const last = input.last_name.trim();
  if (!first) throw new RuleError("First name is required.", "validation");

  const result = db()
    .prepare(
      `INSERT INTO contacts (
        company_id, first_name, last_name, title, phone, email, is_primary, is_example
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
    )
    .run(companyId, first, last, input.title?.trim() || "", phone, email);

  logActivity(companyId, Number(result.lastInsertRowid), "contact", "Contact added. Email stored only if provided.");
  return db()
    .prepare("SELECT * FROM contacts WHERE id = ?")
    .get(result.lastInsertRowid) as Contact;
}

export function listDnc(): Array<DncEntry & { company?: string | null; contact?: string | null }> {
  return db()
    .prepare(
      `SELECT d.*, c.name AS company, TRIM(ct.first_name || ' ' || IFNULL(ct.last_name, '')) AS contact
       FROM dnc d
       LEFT JOIN companies c ON c.id = d.company_id
       LEFT JOIN contacts ct ON ct.id = d.contact_id
       ORDER BY d.created_at DESC`,
    )
    .all() as Array<DncEntry & { company?: string | null; contact?: string | null }>;
}

export function addDnc(input: {
  company_id?: number | null;
  contact_id?: number | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  reason: string;
}): DncEntry {
  const reason = input.reason.trim();
  if (!reason) throw new RuleError("DNC reason is required.", "validation");

  const email = normalizeEmail(input.email ?? null);
  const phone = normalizePhone(input.phone ?? null);
  let companyName = input.company_name?.trim() || null;
  let companyId = input.company_id ?? null;
  let contactId = input.contact_id ?? null;

  if (companyId) {
    const company = getCompany(companyId);
    companyName = company.name;
    db()
      .prepare("UPDATE companies SET stage = 'dnc', updated_at = ? WHERE id = ?")
      .run(nowIso(), companyId);
  }

  const result = db()
    .prepare(
      `INSERT INTO dnc (company_id, contact_id, company_name, email, phone, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(companyId, contactId, companyName, email, phone, reason, nowIso());

  if (companyId) {
    logActivity(companyId, contactId, "dnc", reason);
  }

  return db().prepare("SELECT * FROM dnc WHERE id = ?").get(result.lastInsertRowid) as DncEntry;
}

export function removeDnc(id: number): void {
  db().prepare("DELETE FROM dnc WHERE id = ?").run(id);
}

export function findDncHits(company: Company, contact?: Contact | null): DncEntry[] {
  const rows = db().prepare("SELECT * FROM dnc").all() as DncEntry[];
  const email = normalizeEmail(contact?.email ?? null);
  const phones = [normalizePhone(company.phone), normalizePhone(contact?.phone ?? null)].filter(
    Boolean,
  ) as string[];
  const name = company.name.trim().toLowerCase();

  return rows.filter((entry) => {
    if (entry.company_id && entry.company_id === company.id) return true;
    if (contact && entry.contact_id && entry.contact_id === contact.id) return true;
    if (email && normalizeEmail(entry.email) === email) return true;
    if (entry.phone && phones.includes(normalizePhone(entry.phone) || "")) return true;
    if (entry.company_name && entry.company_name.trim().toLowerCase() === name) return true;
    return false;
  });
}

function isCompanyDnc(company: Company, contacts: Contact[]): boolean {
  if (company.stage === "dnc") return true;
  return contacts.some((contact) => findDncHits(company, contact).length > 0) || findDncHits(company, null).length > 0;
}

export function assertFirstTouchAllowed(company: Company, contact: Contact): void {
  const hits = findDncHits(company, contact);
  if (hits.length > 0) {
    throw new RuleError(
      `DNC blocks first-touch: ${hits[0].reason}`,
      "dnc_blocks_first_touch",
    );
  }
}

export function listDrafts(status?: string): DraftView[] {
  const sql = status
    ? `SELECT d.*, c.name AS company_name, c.is_example,
              ct.first_name AS contact_first_name, ct.last_name AS contact_last_name,
              ct.email AS contact_email, ct.phone AS contact_phone
       FROM drafts d
       JOIN companies c ON c.id = d.company_id
       JOIN contacts ct ON ct.id = d.contact_id
       WHERE d.status = ?
       ORDER BY d.created_at DESC`
    : `SELECT d.*, c.name AS company_name, c.is_example,
              ct.first_name AS contact_first_name, ct.last_name AS contact_last_name,
              ct.email AS contact_email, ct.phone AS contact_phone
       FROM drafts d
       JOIN companies c ON c.id = d.company_id
       JOIN contacts ct ON ct.id = d.contact_id
       ORDER BY CASE d.status
         WHEN 'draft' THEN 0
         WHEN 'approved' THEN 1
         WHEN 'copied' THEN 2
         WHEN 'blocked' THEN 3
         ELSE 4 END, d.created_at DESC`;
  return (status ? db().prepare(sql).all(status) : db().prepare(sql).all()) as DraftView[];
}

export function getDraft(id: number): DraftView {
  const draft = db()
    .prepare(
      `SELECT d.*, c.name AS company_name, c.is_example,
              ct.first_name AS contact_first_name, ct.last_name AS contact_last_name,
              ct.email AS contact_email, ct.phone AS contact_phone
       FROM drafts d
       JOIN companies c ON c.id = d.company_id
       JOIN contacts ct ON ct.id = d.contact_id
       WHERE d.id = ?`,
    )
    .get(id) as DraftView | undefined;
  if (!draft) throw new RuleError("Draft not found.", "not_found");
  return draft;
}

export function createFirstTouchDraft(input: {
  company_id: number;
  contact_id: number;
  hook_line: string;
}): DraftView {
  const company = getCompany(input.company_id);
  const contact = company.contacts.find((c) => c.id === input.contact_id);
  if (!contact) throw new RuleError("Contact not found on this company.", "not_found");

  try {
    assertFirstTouchAllowed(company, contact);
  } catch (error) {
    if (error instanceof RuleError && error.code === "dnc_blocks_first_touch") {
      const settings = getSettings();
      const rendered = fillLockedFirstTouch({
        company: company.name,
        firstName: contact.first_name,
        hookLine: input.hook_line,
        senderName: settings.sender_name,
        senderPhone: settings.sender_phone,
      });
      const result = db()
        .prepare(
          `INSERT INTO drafts (
            company_id, contact_id, kind, subject, body, hook_line, status,
            blocked_reason, created_at, approved_at, copied_at, sent_at
          ) VALUES (?, ?, 'first_touch', ?, ?, ?, 'blocked', ?, ?, NULL, NULL, NULL)`,
        )
        .run(
          company.id,
          contact.id,
          rendered.subject,
          rendered.body,
          input.hook_line.trim(),
          error.message,
          nowIso(),
        );
      logActivity(company.id, contact.id, "draft_blocked", error.message);
      return getDraft(Number(result.lastInsertRowid));
    }
    throw error;
  }

  const settings = getSettings();
  const rendered = fillLockedFirstTouch({
    company: company.name,
    firstName: contact.first_name,
    hookLine: input.hook_line,
    senderName: settings.sender_name,
    senderPhone: settings.sender_phone,
  });

  validateFirstTouchContent({
    hookLine: input.hook_line,
    subject: rendered.subject,
    body: rendered.body,
    fleetCountsEnabled: settings.fleet_counts_enabled === 1,
  });

  const result = db()
    .prepare(
      `INSERT INTO drafts (
        company_id, contact_id, kind, subject, body, hook_line, status,
        blocked_reason, created_at, approved_at, copied_at, sent_at
      ) VALUES (?, ?, 'first_touch', ?, ?, ?, 'draft', NULL, ?, NULL, NULL, NULL)`,
    )
    .run(
      company.id,
      contact.id,
      rendered.subject,
      rendered.body,
      input.hook_line.trim(),
      nowIso(),
    );

  logActivity(company.id, contact.id, "draft_created", "First-touch draft created from locked template.");
  return getDraft(Number(result.lastInsertRowid));
}

export function approveDraft(id: number): DraftView {
  const draft = getDraft(id);
  const company = getCompany(draft.company_id);
  const contact = company.contacts.find((c) => c.id === draft.contact_id);
  if (!contact) throw new RuleError("Contact missing.", "not_found");
  assertFirstTouchAllowed(company, contact);

  const settings = getSettings();
  if (draft.kind === "first_touch") {
    const locked = isLockedFirstTouch(draft.subject, draft.body, {
      company: company.name,
      firstName: contact.first_name,
      hookLine: draft.hook_line,
      senderName: settings.sender_name,
      senderPhone: settings.sender_phone,
    });
    if (!locked) {
      throw new RuleError("First-touch template is locked and no longer matches.", "locked_template");
    }
    validateFirstTouchContent({
      hookLine: draft.hook_line,
      subject: draft.subject,
      body: draft.body,
      fleetCountsEnabled: settings.fleet_counts_enabled === 1,
    });
  }

  const now = nowIso();
  db()
    .prepare("UPDATE drafts SET status = 'approved', approved_at = ? WHERE id = ?")
    .run(now, id);
  logActivity(company.id, contact.id, "draft_approved", `Approved draft #${id}. Not sent.`);
  return getDraft(id);
}

export function markDraftCopied(id: number): DraftView {
  const draft = getDraft(id);
  if (draft.status === "blocked") {
    throw new RuleError("Blocked drafts cannot be copied.", "blocked");
  }
  const now = nowIso();
  const next = draft.status === "sent" ? "sent" : "copied";
  db()
    .prepare("UPDATE drafts SET status = ?, copied_at = ? WHERE id = ?")
    .run(next, now, id);
  logActivity(draft.company_id, draft.contact_id, "draft_copied", "Copied to clipboard. Console did not send.");
  return getDraft(id);
}

export function markDraftSent(id: number): DraftView {
  const draft = getDraft(id);
  if (draft.status === "blocked") {
    throw new RuleError("Blocked drafts cannot be marked sent.", "blocked");
  }
  if (draft.status !== "approved" && draft.status !== "copied") {
    throw new RuleError("Approve the draft before marking it sent.", "not_approved");
  }
  validateMarkSent(draft.contact_email);
  const now = nowIso();
  db()
    .prepare("UPDATE drafts SET status = 'sent', sent_at = ? WHERE id = ?")
    .run(now, id);
  db()
    .prepare("UPDATE companies SET last_touch_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, draft.company_id);
  logActivity(
    draft.company_id,
    draft.contact_id,
    "marked_sent",
    "Manually marked sent after copy. This console did not transmit email.",
  );
  return getDraft(id);
}

export function upsertCrm(
  companyId: number,
  input: { freight_profile: string; decision_notes: string; next_meeting_at?: string | null },
): CrmRecord {
  const company = getCompany(companyId);
  if (company.stage !== "replied") {
    throw new RuleError("CRM only after Replied.", "crm_after_replied");
  }
  const now = nowIso();
  const existing = db()
    .prepare("SELECT * FROM crm_records WHERE company_id = ?")
    .get(companyId) as CrmRecord | undefined;

  if (existing) {
    db()
      .prepare(
        `UPDATE crm_records SET freight_profile = ?, decision_notes = ?, next_meeting_at = ?, updated_at = ?
         WHERE company_id = ?`,
      )
      .run(
        input.freight_profile.trim(),
        input.decision_notes.trim(),
        input.next_meeting_at ?? null,
        now,
        companyId,
      );
  } else {
    db()
      .prepare(
        `INSERT INTO crm_records (company_id, freight_profile, decision_notes, next_meeting_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        companyId,
        input.freight_profile.trim(),
        input.decision_notes.trim(),
        input.next_meeting_at ?? null,
        now,
        now,
      );
  }

  logActivity(companyId, null, "crm", "CRM record updated after Replied.");
  return db()
    .prepare("SELECT * FROM crm_records WHERE company_id = ?")
    .get(companyId) as CrmRecord;
}

export function logCall(companyId: number, contactId: number | null, notes: string): Activity {
  const now = nowIso();
  db()
    .prepare("UPDATE companies SET last_touch_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, companyId);
  return logActivity(companyId, contactId, "call", notes.trim() || "Logged call.");
}

export function listActivities(companyId: number): Activity[] {
  return db()
    .prepare("SELECT * FROM activities WHERE company_id = ? ORDER BY created_at DESC, id DESC")
    .all(companyId) as Activity[];
}

function logActivity(
  companyId: number,
  contactId: number | null,
  type: string,
  notes: string,
): Activity {
  const result = db()
    .prepare(
      `INSERT INTO activities (company_id, contact_id, type, notes, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(companyId, contactId, type, notes, nowIso());
  return db().prepare("SELECT * FROM activities WHERE id = ?").get(result.lastInsertRowid) as Activity;
}

export function getTodayBoard() {
  const companies = listCompanies();
  const drafts = listDrafts();
  const settings = getSettings();

  const working = companies.filter((c) => c.stage === "working");
  const calls = working
    .filter((c) => !c.dnc)
    .map((company) => {
      const contact = company.contacts.find((x) => x.is_primary) ?? company.contacts[0];
      const email = displayEmail(contact?.email);
      return {
        company,
        contact,
        why: !email
          ? "No email on file — do not invent. Phone first."
          : company.next_action_type === "call"
            ? "Phone-first working account."
            : "Working account — call before you copy mail.",
        hasEmail: Boolean(email),
      };
    });

  return {
    settings,
    calls,
    pendingDrafts: drafts.filter((d) => d.status === "draft"),
    readyToCopy: drafts.filter((d) => d.status === "approved" || d.status === "copied"),
    replied: companies.filter((c) => c.stage === "replied"),
    dnc: companies.filter((c) => c.dnc),
    counts: {
      working: working.length,
      next_up: companies.filter((c) => c.stage === "next_up").length,
      backfill: companies.filter((c) => c.stage === "backfill").length,
      drafts: drafts.filter((d) => d.status === "draft" || d.status === "approved").length,
      dnc: companies.filter((c) => c.dnc).length,
    },
  };
}
