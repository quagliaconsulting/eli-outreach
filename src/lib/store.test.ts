import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { RuleError } from "./types";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eli-outreach-"));
process.env.ELI_DATA_DIR = tmp;

describe("ops store rules", () => {
  let store: typeof import("./store");
  let dbMod: typeof import("./db");
  let seedMod: typeof import("./seed");

  before(async () => {
    dbMod = await import("./db");
    seedMod = await import("./seed");
    store = await import("./store");
    store.getSettings();
    assert.equal(
      store.listCompanies().length,
      0,
      "seedIfEmpty must not insert fictional companies once settings exist",
    );
    seedMod.seedExampleCompanies(dbMod.getDb());
  });

  after(() => {
    dbMod.closeDb();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("loads example companies as is_example=1 and keeps fleet counts off", () => {
    const settings = store.getSettings();
    assert.equal(settings.fleet_counts_enabled, 0);
    assert.equal(settings.sender_email, "max@elbertalogistics.net");
    assert.equal(settings.reply_to_email, "max@elbertalogistics.net");
    assert.equal(settings.timezone, "America/New_York");
    const examples = store.listCompanies().filter((c) => c.is_example === 1);
    assert.ok(examples.length >= 8 && examples.length <= 12);
    assert.ok(examples.every((c) => c.is_example === 1));
  });

  it("blocks first-touch for a DNC account", () => {
    const magnolia = store.listCompanies().find((c) => c.name === "Magnolia Paper Converting");
    assert.ok(magnolia);
    const draft = store.createFirstTouchDraft({
      company_id: magnolia.id,
      contact_id: magnolia.contacts[0].id,
      hook_line: "you convert paper in Tallahassee and may need dry van truckload",
    });
    assert.equal(draft.status, "blocked");
    assert.match(draft.blocked_reason ?? "", /DNC/);
    assert.throws(
      () => store.approveDraft(draft.id),
      (error: unknown) => error instanceof RuleError && error.code === "dnc_blocks_first_touch",
    );
  });

  it("refuses CRM before Replied", () => {
    const pinecrest = store.listCompanies().find((c) => c.name === "Pinecrest Produce Co.");
    assert.ok(pinecrest);
    assert.throws(
      () =>
        store.upsertCrm(pinecrest.id, {
          freight_profile: "should not save",
          decision_notes: "no",
        }),
      (error: unknown) => error instanceof RuleError && error.code === "crm_after_replied",
    );
  });

  it("allows CRM only after Replied", () => {
    const gulf = store.listCompanies().find((c) => c.name === "Gulfstream Marine Parts");
    assert.ok(gulf);
    const crm = store.upsertCrm(gulf.id, {
      freight_profile: "dry van after ocean",
      decision_notes: "intro booked",
    });
    assert.equal(crm.freight_profile, "dry van after ocean");
  });

  it("will not mark sent without an email on file", () => {
    const flint = store.listCompanies().find((c) => c.name === "Flint River Packaging");
    assert.ok(flint);
    assert.equal(flint.contacts[0].email, null);
    const draft = store.createFirstTouchDraft({
      company_id: flint.id,
      contact_id: flint.contacts[0].id,
      hook_line: "you ship packaging from Albany and may need dry van truckload into the Southeast",
    });
    const approved = store.approveDraft(draft.id);
    assert.equal(approved.status, "approved");
    assert.throws(
      () => store.markDraftSent(approved.id),
      (error: unknown) => error instanceof RuleError && error.code === "no_email_on_file",
    );
  });

  it("createCompany writes a real next_up account with is_example 0", () => {
    const company = store.createCompany({
      name: "Wiregrass Building Supply",
      industry: "Building materials",
      city: "Dothan",
      state: "AL",
      phone: "334-702-0100",
    });
    assert.equal(company.is_example, 0);
    assert.equal(company.stage, "next_up");
    assert.equal(company.next_action_type, "call");
    assert.equal(company.contacts.length, 0);
    assert.notEqual(
      store.listCompanies().find((c) => c.name === "Pinecrest Produce Co.")?.is_example,
      0,
    );
  });

  it("allows a switchboard-only contact and a published email, and rejects invented-looking email", () => {
    const board = store.createCompany({
      name: "Chipley Cold Storage",
      contact: { first_name: "Shipping", last_name: "" },
    });
    assert.equal(board.is_example, 0);
    assert.equal(board.contacts[0].first_name, "Shipping");
    assert.equal(board.contacts[0].last_name, "");
    assert.equal(board.contacts[0].email, null);
    assert.equal(board.contacts[0].is_example, 0);

    const published = store.createCompany({
      name: "Published Email Shipper",
      contact: {
        first_name: "Pat",
        last_name: "Lee",
        email: "pat.lee@published-shipper.com",
      },
    });
    assert.equal(published.contacts[0].email, "pat.lee@published-shipper.com");

    assert.throws(
      () =>
        store.createCompany({
          name: "Invented Email Shipper",
          contact: { first_name: "Sam", email: "sam@" },
        }),
      (error: unknown) => error instanceof RuleError && error.code === "invalid_email",
    );
    assert.equal(
      store.listCompanies().some((c) => c.name === "Invented Email Shipper"),
      false,
    );
  });

  it("bulk-creates real companies atomically and caps at 50", () => {
    const created = store.createCompaniesBulk([
      { name: "Bulk One Co" },
      { name: "Bulk Two Co", contact: { first_name: "Shipping" } },
    ]);
    assert.equal(created.length, 2);
    assert.ok(created.every((c) => c.is_example === 0));

    assert.throws(
      () =>
        store.createCompaniesBulk([
          { name: "Bulk Should Rollback" },
          { name: "Bulk Bad Email", contact: { first_name: "A", email: "not-an-email" } },
        ]),
      (error: unknown) => error instanceof RuleError && error.code === "invalid_email",
    );
    assert.equal(
      store.listCompanies().some((c) => c.name === "Bulk Should Rollback"),
      false,
    );

    assert.throws(
      () => store.createCompaniesBulk(Array.from({ length: 51 }, (_, i) => ({ name: `Too Many ${i}` }))),
      (error: unknown) => error instanceof RuleError && error.code === "validation",
    );
  });

  it("purges example rows only and does not re-seed when settings already exist", () => {
    const real = store.createCompany({
      name: "Live Review Shipper",
      stage: "working",
      contact: { first_name: "Jordan", last_name: "Miles", email: "jordan.miles@livereview.example" },
    });
    store.addDnc({
      company_id: real.id,
      reason: "Keep this real DNC through purge.",
    });
    const realDraft = store.createFirstTouchDraft({
      company_id: real.id,
      contact_id: real.contacts[0].id,
      hook_line: "you ship from the wiregrass and may need dry van truckload",
    });
    assert.equal(realDraft.status, "blocked");

    const before = store.listCompanies();
    const exampleIds = before.filter((c) => c.is_example === 1).map((c) => c.id);
    const realIds = before.filter((c) => c.is_example === 0).map((c) => c.id);
    assert.ok(exampleIds.length >= 8);
    assert.ok(realIds.includes(real.id));

    const database = dbMod.getDb();
    const exampleDraftsBefore = (
      database
        .prepare(
          `SELECT COUNT(*) AS n FROM drafts
           WHERE company_id IN (SELECT id FROM companies WHERE is_example = 1)`,
        )
        .get() as { n: number }
    ).n;
    const exampleCrmBefore = (
      database
        .prepare(
          `SELECT COUNT(*) AS n FROM crm_records
           WHERE company_id IN (SELECT id FROM companies WHERE is_example = 1)`,
        )
        .get() as { n: number }
    ).n;
    const exampleDncBefore = (
      database
        .prepare(
          `SELECT COUNT(*) AS n FROM dnc
           WHERE company_id IN (SELECT id FROM companies WHERE is_example = 1)`,
        )
        .get() as { n: number }
    ).n;
    assert.ok(exampleDraftsBefore > 0);
    assert.ok(exampleCrmBefore > 0);
    assert.ok(exampleDncBefore > 0);

    const result = store.purgeExampleCompanies();
    assert.equal(result.purged, exampleIds.length);

    const after = store.listCompanies();
    assert.ok(after.every((c) => c.is_example === 0));
    assert.ok(realIds.every((id) => after.some((c) => c.id === id)));
    assert.ok(exampleIds.every((id) => !after.some((c) => c.id === id)));

    assert.equal(
      (database.prepare("SELECT COUNT(*) AS n FROM companies WHERE is_example = 1").get() as { n: number }).n,
      0,
    );
    assert.equal(
      (
        database
          .prepare(
            `SELECT COUNT(*) AS n FROM contacts
             WHERE company_id IN (${exampleIds.map(() => "?").join(",")})`,
          )
          .get(...exampleIds) as { n: number }
      ).n,
      0,
    );
    assert.equal(
      (
        database
          .prepare(
            `SELECT COUNT(*) AS n FROM drafts
             WHERE company_id IN (${exampleIds.map(() => "?").join(",")})`,
          )
          .get(...exampleIds) as { n: number }
      ).n,
      0,
    );
    assert.equal(
      (
        database
          .prepare(
            `SELECT COUNT(*) AS n FROM activities
             WHERE company_id IN (${exampleIds.map(() => "?").join(",")})`,
          )
          .get(...exampleIds) as { n: number }
      ).n,
      0,
    );
    assert.equal(
      (
        database
          .prepare(
            `SELECT COUNT(*) AS n FROM crm_records
             WHERE company_id IN (${exampleIds.map(() => "?").join(",")})`,
          )
          .get(...exampleIds) as { n: number }
      ).n,
      0,
    );
    assert.equal(
      (
        database
          .prepare(
            `SELECT COUNT(*) AS n FROM dnc
             WHERE company_id IN (${exampleIds.map(() => "?").join(",")})`,
          )
          .get(...exampleIds) as { n: number }
      ).n,
      0,
    );

    const kept = store.getCompany(real.id);
    assert.equal(kept.is_example, 0);
    assert.equal(kept.stage, "dnc");
    assert.equal(kept.contacts[0].email, "jordan.miles@livereview.example");
    assert.ok(kept.dnc);
    assert.ok(store.listDrafts().some((d) => d.id === realDraft.id));

    seedMod.seedIfEmpty(database);
    assert.equal(
      (database.prepare("SELECT COUNT(*) AS n FROM companies WHERE is_example = 1").get() as { n: number }).n,
      0,
    );

    dbMod.closeDb();
    const reopened = dbMod.getDb();
    const settings = reopened.prepare("SELECT id FROM settings WHERE id = 1").get();
    assert.ok(settings);
    assert.equal(
      (reopened.prepare("SELECT COUNT(*) AS n FROM companies WHERE is_example = 1").get() as { n: number }).n,
      0,
    );
    assert.ok(store.listCompanies().some((c) => c.id === real.id && c.is_example === 0));
  });

  it("lists named decision-makers with auto first-touch drafts and hides switchboard and DNC", () => {
    const shipping = store.createCompany({
      name: "Switchboard Only Co",
      stage: "backfill",
      contact: { first_name: "Shipping" },
    });
    const named = store.createCompany({
      name: "Named Decision Co",
      industry: "Food processing",
      city: "Valdosta",
      state: "GA",
      notes: "Plant ships dry van outbound to Florida DCs.",
      contact: {
        first_name: "Rita",
        last_name: "Cole",
        title: "Transportation Manager",
        phone: "229-555-0199",
        email: "rita.cole@named-decision.example",
      },
    });
    assert.equal(store.listDrafts().some((draft) => draft.company_id === named.id), false);

    const open = store.getWorkstation("open");
    assert.equal(
      open.leads.some((lead) => lead.company.id === shipping.id),
      false,
    );
    const lead = open.leads.find((item) => item.company.id === named.id);
    assert.ok(lead);
    assert.equal(lead.contact.first_name, "Rita");
    assert.equal(lead.contact.title, "Transportation Manager");
    assert.ok(lead.draft);
    assert.equal(lead.draft.status, "draft");
    assert.equal(lead.draft.subject, "Named Decision Co truckload capacity — 15 minutes?");
    assert.match(lead.draft.body, /Plant ships dry van outbound to Florida DCs/);
    assert.match(lead.draft.body, /https:\/\/elbertalogistics.com\/services\//);
    assert.doesNotMatch(lead.draft.body, /phone first/i);
    assert.equal(lead.quality.tier, "A");
    assert.ok(lead.quality.score >= 70);
    assert.match(lead.quality.reason, /Named work email/);
    assert.equal(lead.company.quality.tier, "A");

    const again = store.getWorkstation("open");
    assert.equal(again.leads.find((item) => item.company.id === named.id)?.draft?.id, lead.draft.id);

    const dncNamed = store.createCompany({
      name: "Quiet DNC Plant",
      contact: { first_name: "Owen", last_name: "Blake", title: "Logistics Manager" },
    });
    store.addDnc({ company_id: dncNamed.id, reason: "Do not contact." });
    const afterDnc = store.getWorkstation("open");
    assert.equal(
      afterDnc.leads.some((item) => item.company.id === dncNamed.id),
      false,
    );
  });

  it("scores a new company on insert and supports quality sort plus email and tier filters", () => {
    const phoneOnly = store.createCompany({
      name: "ZZ Quality Phone Only",
      industry: "Textiles",
      city: "Fresno",
      state: "CA",
      contact: {
        first_name: "Kim",
        last_name: "Dale",
        title: "Clerk",
        phone: "559-555-0100",
      },
    });
    assert.ok(phoneOnly.quality.score >= 0);
    assert.ok(phoneOnly.quality.score <= 100);
    assert.match(phoneOnly.quality.reason, /No email on file/);
    assert.equal(phoneOnly.quality.tier, "C");

    const strong = store.createCompany({
      name: "AA Quality Named Email",
      industry: "Produce / food",
      city: "Valdosta",
      state: "GA",
      website: "https://aa-quality.example",
      contact: {
        first_name: "Rita",
        last_name: "Cole",
        title: "Director of Logistics",
        phone: "229-555-0111",
        email: "rita.cole@aa-quality.example",
      },
    });
    assert.equal(strong.quality.tier, "A");
    assert.ok(strong.quality.score > phoneOnly.quality.score);

    const byQuality = store.getWorkstation({ filter: "open", sort: "quality" });
    const qualityIds = byQuality.leads.map((lead) => lead.company.id);
    assert.ok(qualityIds.includes(strong.id));
    assert.ok(qualityIds.includes(phoneOnly.id));
    assert.ok(qualityIds.indexOf(strong.id) < qualityIds.indexOf(phoneOnly.id));
    assert.ok(
      byQuality.leads.every((lead, index, list) => {
        if (index === 0) return true;
        return list[index - 1].quality.score >= lead.quality.score;
      }),
    );

    const byCompany = store.getWorkstation({ filter: "open", sort: "company" });
    const names = byCompany.leads.map((lead) => lead.company.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    assert.deepEqual(names, sorted);

    const byAdded = store.getWorkstation({ filter: "open", sort: "added" });
    assert.equal(byAdded.leads[0]?.company.id, strong.id);

    const emailOnly = store.getWorkstation({ filter: "open", email: true });
    assert.equal(
      emailOnly.leads.some((lead) => lead.company.id === phoneOnly.id),
      false,
    );
    assert.ok(emailOnly.leads.some((lead) => lead.company.id === strong.id));
    assert.ok(emailOnly.leads.every((lead) => Boolean(lead.contact.email)));

    const tierA = store.getWorkstation({ filter: "open", tier: "A" });
    assert.ok(tierA.leads.every((lead) => lead.quality.tier === "A"));
    assert.ok(tierA.leads.some((lead) => lead.company.id === strong.id));
    assert.equal(
      tierA.leads.some((lead) => lead.company.id === phoneOnly.id),
      false,
    );
    assert.equal(store.getWorkstation("open").send, false);
  });

  it("blocks SMTP send when the lead is DNC", async () => {
    const mail = await import("./mail");
    process.env.SEND_ENABLED = "true";
    process.env.SMTP_PASS = "app-password-not-for-repo";
    const sent: unknown[] = [];
    mail.setMailTransporterFactory(() => ({
      async sendMail(payload) {
        sent.push(payload);
        return {};
      },
    }));
    try {
      const company = store.createCompany({
        name: "SMTP DNC Plant",
        contact: {
          first_name: "Dana",
          last_name: "Cole",
          title: "Logistics Manager",
          email: "dana.cole@smtp-dnc.example",
        },
      });
      store.addDnc({ company_id: company.id, reason: "Quiet suppress." });
      const draft = store.createFirstTouchDraft({
        company_id: company.id,
        contact_id: company.contacts[0].id,
        hook_line: "you ship from the wiregrass and may need dry van truckload",
      });
      assert.equal(draft.status, "blocked");
      await assert.rejects(
        () => store.approveAndSendDraft(draft.id),
        (error: unknown) => error instanceof RuleError && error.code === "dnc_blocks_first_touch",
      );
      assert.equal(store.getDraft(draft.id).status, "blocked");
      assert.equal(sent.length, 0);
    } finally {
      delete process.env.SEND_ENABLED;
      delete process.env.SMTP_PASS;
      mail.setMailTransporterFactory(null);
    }
  });

  it("blocks SMTP send when the lead has no published email", async () => {
    const mail = await import("./mail");
    process.env.SEND_ENABLED = "true";
    process.env.SMTP_PASS = "app-password-not-for-repo";
    const sent: unknown[] = [];
    mail.setMailTransporterFactory(() => ({
      async sendMail(payload) {
        sent.push(payload);
        return {};
      },
    }));
    try {
      const company = store.createCompany({
        name: "SMTP No Email Co",
        contact: { first_name: "Kim", last_name: "Noemail", title: "Traffic Manager" },
      });
      const draft = store.createFirstTouchDraft({
        company_id: company.id,
        contact_id: company.contacts[0].id,
        hook_line: "you ship packaging from Albany and may need dry van truckload",
      });
      await assert.rejects(
        () => store.approveAndSendDraft(draft.id),
        (error: unknown) => error instanceof RuleError && error.code === "no_email_on_file",
      );
      assert.equal(store.getDraft(draft.id).status, "draft");
      assert.equal(store.getDraft(draft.id).sent_at, null);
      assert.equal(sent.length, 0);
    } finally {
      delete process.env.SEND_ENABLED;
      delete process.env.SMTP_PASS;
      mail.setMailTransporterFactory(null);
    }
  });

  it("keeps copy-only Approve when SEND_ENABLED is false even if SMTP_PASS is set", async () => {
    const mail = await import("./mail");
    process.env.SEND_ENABLED = "false";
    process.env.SMTP_PASS = "app-password-not-for-repo";
    const sent: unknown[] = [];
    mail.setMailTransporterFactory(() => ({
      async sendMail(payload) {
        sent.push(payload);
        return {};
      },
    }));
    try {
      const company = store.createCompany({
        name: "SMTP Flag Off Co",
        contact: {
          first_name: "Lee",
          last_name: "Park",
          email: "lee.park@smtp-flag-off.example",
        },
      });
      const draft = store.createFirstTouchDraft({
        company_id: company.id,
        contact_id: company.contacts[0].id,
        hook_line: "you ship from the wiregrass and may need dry van truckload",
      });
      await assert.rejects(
        () => store.approveAndSendDraft(draft.id),
        (error: unknown) => error instanceof RuleError && error.code === "send_disabled",
      );
      const approved = store.approveDraft(draft.id);
      assert.equal(approved.status, "approved");
      assert.equal(approved.sent_at, null);
      assert.equal(sent.length, 0);
    } finally {
      delete process.env.SEND_ENABLED;
      delete process.env.SMTP_PASS;
      mail.setMailTransporterFactory(null);
    }
  });

  it("sends the locked draft then marks sent when SMTP is enabled", async () => {
    const mail = await import("./mail");
    process.env.SEND_ENABLED = "true";
    process.env.SMTP_HOST = "mail.privateemail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "max@elbertalogistics.net";
    process.env.SMTP_PASS = "app-password-not-for-repo";
    const sent: Array<{ from: string; to: string; replyTo: string; subject: string; text: string }> = [];
    mail.setMailTransporterFactory(() => ({
      async sendMail(payload) {
        sent.push(payload);
        return { messageId: "mock-store-send" };
      },
    }));
    try {
      const company = store.createCompany({
        name: "SMTP Send Success Co",
        industry: "Food processing",
        city: "Valdosta",
        state: "GA",
        contact: {
          first_name: "Rita",
          last_name: "Cole",
          title: "Transportation Manager",
          email: "rita.send@smtp-success.example",
        },
      });
      const draft = store.createFirstTouchDraft({
        company_id: company.id,
        contact_id: company.contacts[0].id,
        hook_line: "you ship food from Valdosta and may need dry van truckload",
      });
      assert.equal(draft.status, "draft");
      const result = await store.approveAndSendDraft(draft.id);
      assert.equal(result.status, "sent");
      assert.ok(result.sent_at);
      assert.ok(result.approved_at);
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, "rita.send@smtp-success.example");
      assert.equal(sent[0].from, "Max <max@elbertalogistics.net>");
      assert.equal(sent[0].replyTo, "max@elbertalogistics.net");
      assert.equal(sent[0].subject, draft.subject);
      assert.equal(sent[0].text, draft.body);
      assert.doesNotMatch(sent[0].from, /sales@/i);
      const board = store.getWorkstation("sent");
      assert.equal(board.send, true);
      assert.ok(board.leads.some((lead) => lead.draft?.id === result.id && lead.draft.status === "sent"));
    } finally {
      delete process.env.SEND_ENABLED;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      mail.setMailTransporterFactory(null);
    }
  });

  it("does not mark sent when the mocked transporter throws", async () => {
    const mail = await import("./mail");
    process.env.SEND_ENABLED = "true";
    process.env.SMTP_PASS = "app-password-not-for-repo";
    mail.setMailTransporterFactory(() => ({
      async sendMail() {
        throw new Error("connection refused");
      },
    }));
    try {
      const company = store.createCompany({
        name: "SMTP Fail Co",
        contact: {
          first_name: "Pat",
          last_name: "Lee",
          email: "pat.lee@smtp-fail.example",
        },
      });
      const draft = store.createFirstTouchDraft({
        company_id: company.id,
        contact_id: company.contacts[0].id,
        hook_line: "you ship from the wiregrass and may need dry van truckload",
      });
      await assert.rejects(
        () => store.approveAndSendDraft(draft.id),
        (error: unknown) => error instanceof RuleError && error.code === "smtp_send_failed",
      );
      const unchanged = store.getDraft(draft.id);
      assert.equal(unchanged.status, "draft");
      assert.equal(unchanged.sent_at, null);
    } finally {
      delete process.env.SEND_ENABLED;
      delete process.env.SMTP_PASS;
      mail.setMailTransporterFactory(null);
    }
  });
});
