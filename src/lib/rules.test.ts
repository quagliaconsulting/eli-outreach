import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillLockedFirstTouch } from "./templates";
import {
  displayEmail,
  validateFirstTouchContent,
  validateMarkSent,
} from "./rules";
import { RuleError } from "./types";

const base = fillLockedFirstTouch({
  company: "Harborline Imports",
  firstName: "Priya",
  hookLine: "you pull containers through Jacksonville and then need inland truckload",
  senderName: "Max",
  senderPhone: "850-702-9224",
});

describe("first-touch rules", () => {
  it("rejects an LTL lead", () => {
    assert.throws(
      () =>
        validateFirstTouchContent({
          hookLine: "you need LTL coverage out of Jacksonville",
          subject: "Harborline Imports LTL coverage — 15 minutes?",
          body: base.body,
          fleetCountsEnabled: false,
        }),
      (error: unknown) => error instanceof RuleError && error.code === "no_ltl_lead",
    );
  });

  it("rejects a site visit in first-touch", () => {
    assert.throws(
      () =>
        validateFirstTouchContent({
          hookLine: "I would like to visit your warehouse this week",
          subject: base.subject,
          body: `${base.body}\nHappy to visit your facility.`,
          fleetCountsEnabled: false,
        }),
      (error: unknown) => error instanceof RuleError && error.code === "no_site_visits",
    );
  });

  it("rejects fleet counts when the toggle is off", () => {
    assert.throws(
      () =>
        validateFirstTouchContent({
          hookLine: "we can cover you with 70 trucks and 300 trailers",
          subject: base.subject,
          body: base.body,
          fleetCountsEnabled: false,
        }),
      (error: unknown) => error instanceof RuleError && error.code === "fleet_counts_off",
    );
  });

  it("allows a valid truckload hook", () => {
    validateFirstTouchContent({
      hookLine: "you pull containers through Jacksonville and then need inland truckload",
      subject: base.subject,
      body: base.body,
      fleetCountsEnabled: false,
    });
  });
});

describe("never invent emails", () => {
  it("returns null when nothing is on file", () => {
    assert.equal(displayEmail(null), null);
    assert.equal(displayEmail(""), null);
    assert.equal(displayEmail("  "), null);
  });

  it("blocks mark-sent when no email is on file", () => {
    assert.throws(
      () => validateMarkSent(null),
      (error: unknown) => error instanceof RuleError && error.code === "no_email_on_file",
    );
  });
});
