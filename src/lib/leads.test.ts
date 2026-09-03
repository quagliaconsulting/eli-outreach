import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFirstTouchHook,
  isNamedDecisionMaker,
  isSwitchboardContact,
  namedContact,
  sanitizeNotesForHook,
} from "./leads";

describe("named decision-makers", () => {
  it("treats switchboard-only Shipping rows as not named", () => {
    assert.equal(isSwitchboardContact({ first_name: "Shipping", last_name: "" }), true);
    assert.equal(isNamedDecisionMaker({ first_name: "Shipping", last_name: "" }), false);
    assert.equal(isNamedDecisionMaker({ first_name: "Elena", last_name: "Vargas" }), true);
    assert.equal(isNamedDecisionMaker({ first_name: "Marcus", last_name: "" }), true);
  });

  it("prefers the primary named contact and skips Shipping", () => {
    const contact = namedContact({
      contacts: [
        {
          id: 1,
          company_id: 1,
          first_name: "Shipping",
          last_name: "",
          title: "Board",
          phone: "229-555-0100",
          email: null,
          is_primary: 1,
          is_example: 0,
        },
        {
          id: 2,
          company_id: 1,
          first_name: "Elena",
          last_name: "Vargas",
          title: "Transportation Manager",
          phone: "229-555-0142",
          email: "elena.vargas@example.com",
          is_primary: 0,
          is_example: 0,
        },
      ],
    });
    assert.equal(contact?.first_name, "Elena");
  });
});

describe("first-touch hook from notes", () => {
  it("uses a short hook from notes when the notes are usable", () => {
    const hook = buildFirstTouchHook({
      notes: "Seasonal outbound produce into the Southeast.",
      industry: "Produce / food",
      city: "Bainbridge",
      state: "GA",
    });
    assert.equal(hook, "Seasonal outbound produce into the Southeast");
  });

  it("strips phone-first / do-not-invent language and falls back to place", () => {
    assert.equal(sanitizeNotesForHook("No email on file. Do not invent one. Call the board."), "");
    const hook = buildFirstTouchHook({
      notes: "No email on file. Do not invent one. Call the board.",
      industry: "Packaging",
      city: "Albany",
      state: "GA",
    });
    assert.equal(hook, "you work in Packaging in Albany, GA and may need truckload coverage");
    assert.doesNotMatch(hook, /phone/i);
    assert.doesNotMatch(hook, /call/i);
  });

  it("does not copy an LTL or fleet-count note into the hook", () => {
    const hook = buildFirstTouchHook({
      notes: "They need LTL coverage and have 70 trucks.",
      city: "Jacksonville",
      state: "FL",
    });
    assert.equal(hook, "you ship from Jacksonville, FL and may need truckload coverage");
  });
});
