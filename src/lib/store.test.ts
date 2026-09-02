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

  before(async () => {
    store = await import("./store");
    store.getSettings();
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("seeds example companies and keeps fleet counts off", () => {
    const settings = store.getSettings();
    assert.equal(settings.fleet_counts_enabled, 0);
    assert.equal(settings.sender_email, "max@elbertalogistics.net");
    assert.equal(settings.reply_to_email, "max@elbertalogistics.net");
    assert.equal(settings.timezone, "America/New_York");
    const companies = store.listCompanies();
    assert.ok(companies.length >= 8 && companies.length <= 12);
    assert.ok(companies.every((c) => c.is_example === 1));
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
});
