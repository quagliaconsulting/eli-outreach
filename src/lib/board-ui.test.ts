import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approveDisabledTitle,
  clearDraftActionError,
  formatCopiedDraft,
  publishedLeadEmail,
  setDraftActionError,
  shouldShowApproveDisabledStamp,
} from "./board-ui";

describe("lead card approve / copy targeting", () => {
  it("prefers contact.email over draft.contact_email and never invents one", () => {
    assert.equal(
      publishedLeadEmail("james@ciclodata.com", "other@example.com"),
      "james@ciclodata.com",
    );
    assert.equal(publishedLeadEmail(null, "james@ciclodata.com"), "james@ciclodata.com");
    assert.equal(publishedLeadEmail(undefined, "   "), null);
    assert.equal(publishedLeadEmail(null, null), null);
  });

  it("Copy uses the clicked lead subject, body, and published email", () => {
    const text = formatCopiedDraft({
      subject: "Ciclo Data truckload capacity — 15 minutes?",
      body: "Hi James,\nLocked draft for this lead only.",
      contactEmail: "james@ciclodata.com",
      draftContactEmail: "should-not-win@example.com",
    });
    assert.match(text, /^From: max@elbertalogistics\.net/);
    assert.match(text, /Reply-To: max@elbertalogistics\.net/);
    assert.match(text, /To: james@ciclodata.com/);
    assert.doesNotMatch(text, /should-not-win@example.com/);
    assert.match(text, /Subject: Ciclo Data truckload capacity — 15 minutes\?/);
    assert.match(text, /Hi James,\nLocked draft for this lead only\.$/);

    const phoneOnly = formatCopiedDraft({
      subject: "Phone Only Co truckload capacity — 15 minutes?",
      body: "Hi Kim,\nPhone-only draft.",
      contactEmail: null,
      draftContactEmail: null,
    });
    assert.match(phoneOnly, /To: \(no email on file — do not invent\)/);
    assert.doesNotMatch(phoneOnly, /james@ciclodata.com/);
  });

  it("disables Approve with a tooltip when send is on and there is no email", () => {
    assert.equal(
      approveDisabledTitle({ send: true, status: "draft", email: null }),
      "No email on file — cannot send",
    );
    assert.equal(
      approveDisabledTitle({ send: true, status: "draft", email: "james@ciclodata.com" }),
      undefined,
    );
    assert.equal(
      approveDisabledTitle({ send: false, status: "draft", email: null }),
      undefined,
    );
  });

  it("never shows the shared Approve-disabled stamp on phone-only cards", () => {
    assert.equal(
      shouldShowApproveDisabledStamp({ send: true, status: "draft", email: null }),
      false,
    );
    assert.equal(
      shouldShowApproveDisabledStamp({ send: true, status: "draft", email: "james@ciclodata.com" }),
      false,
    );
  });

  it("scopes action errors to the clicked draft id", () => {
    const afterApproveFail = setDraftActionError({}, 11, "Could not send first-touch via SMTP.");
    const afterOtherFail = setDraftActionError(afterApproveFail, 22, "Action failed");
    assert.equal(afterOtherFail[11], "Could not send first-touch via SMTP.");
    assert.equal(afterOtherFail[22], "Action failed");
    assert.equal(clearDraftActionError(afterOtherFail, 11)[11], undefined);
    assert.equal(clearDraftActionError(afterOtherFail, 11)[22], "Action failed");
  });
});
