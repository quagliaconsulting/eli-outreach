import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCKED_FIRST_TOUCH_SIGNATURE } from "./constants";
import {
  fillLockedFirstTouch,
  firstTouchGreeting,
  isLockedFirstTouch,
  personFirstName,
  selectVertical,
} from "./templates";

const foodVars = {
  company: "Pinecrest Produce Co.",
  industry: "Produce / food",
  notes: "Seasonal outbound produce into the Southeast.",
  name: "Pinecrest Produce Co.",
  firstName: "Elena",
};

describe("selectVertical", () => {
  it("classifies food and beverage from industry, notes, and name", () => {
    assert.equal(selectVertical("Produce / food"), "food_beverage");
    assert.equal(selectVertical("Beverage"), "food_beverage");
    assert.equal(selectVertical("Cold storage"), "food_beverage");
    assert.equal(selectVertical("Food processing"), "food_beverage");
    assert.equal(selectVertical("Dairy"), "food_beverage");
    assert.equal(
      selectVertical("", { name: "Sunbelt Beverage Distributors" }),
      "food_beverage",
    );
    assert.equal(
      selectVertical("Distribution", { notes: "Reefer truckload out of Tampa." }),
      "food_beverage",
    );
  });

  it("classifies raw materials for coil, tubing, scrap, and steel/aluminum", () => {
    assert.equal(selectVertical("Metals"), "raw_materials");
    assert.equal(selectVertical("Steel"), "raw_materials");
    assert.equal(
      selectVertical("", { name: "Ironwood Steel Supply" }),
      "raw_materials",
    );
    assert.equal(
      selectVertical("Manufacturing", { notes: "aluminum coils and tubing" }),
      "raw_materials",
    );
    assert.equal(selectVertical("Scrap metal"), "raw_materials");
  });

  it("classifies chemical only when coatings, solvents, hazmat, paint, or heat-treat chemistry are clear", () => {
    assert.equal(selectVertical("Chemical"), "chemical");
    assert.equal(selectVertical("Coatings"), "chemical");
    assert.equal(
      selectVertical("Manufacturing", { notes: "hazmat solvents and paint" }),
      "chemical",
    );
    assert.equal(
      selectVertical("Industrial", { notes: "heat-treat chemistry for parts" }),
      "chemical",
    );
    assert.equal(
      selectVertical("Heat treat", { notes: "in-house heat treat line" }),
      "manufacturing",
    );
  });

  it("classifies polymer and plastics recycling as chemical, not manufacturing", () => {
    assert.equal(selectVertical("Plastics recycling"), "chemical");
    assert.equal(selectVertical("Polymer processing"), "chemical");
    assert.equal(selectVertical("", { name: "Custom Polymers" }), "chemical");
    assert.equal(
      selectVertical("Recycling", { name: "Custom Polymers", notes: "plastics recycling" }),
      "chemical",
    );
    assert.equal(selectVertical("Recycling"), "manufacturing");
    assert.equal(selectVertical("Scrap recycling"), "raw_materials");
  });

  it("defaults unclear, auto, building products, packaging, furniture, and lumber to manufacturing", () => {
    assert.equal(selectVertical(""), "manufacturing");
    assert.equal(selectVertical("   "), "manufacturing");
    assert.equal(selectVertical("Automotive"), "manufacturing");
    assert.equal(selectVertical("Building materials"), "manufacturing");
    assert.equal(selectVertical("Packaging"), "manufacturing");
    assert.equal(selectVertical("Furniture manufacturing"), "manufacturing");
    assert.equal(selectVertical("Lumber mill"), "manufacturing");
    assert.equal(selectVertical("Textiles"), "manufacturing");
    assert.equal(selectVertical("Appliances"), "manufacturing");
    assert.equal(selectVertical("Import distribution"), "manufacturing");
    assert.equal(selectVertical("Marine parts"), "manufacturing");
    assert.equal(
      selectVertical("", { name: "Oakridge Furniture Works", notes: "Outbound truckload to DC/retail." }),
      "manufacturing",
    );
  });

  it("picks one vertical when signals collide, preferring the more specific lane", () => {
    assert.equal(selectVertical("Food manufacturing"), "food_beverage");
    assert.equal(selectVertical("Chemical manufacturing"), "chemical");
    assert.equal(selectVertical("Paint manufacturing"), "chemical");
    assert.equal(selectVertical("Steel manufacturing"), "raw_materials");
  });
});

describe("locked first-touch template", () => {
  it("renders Max's food and beverage copy and locked signature", () => {
    const rendered = fillLockedFirstTouch(foodVars);
    assert.equal(rendered.vertical, "food_beverage");
    assert.equal(rendered.subject, "Temperature-controlled freight for Pinecrest Produce Co.");
    assert.equal(
      rendered.body,
      `Hello Elena,

This is Max with Elberta Logistics. We move food and beverage freight for shippers like Perdue, Tillamook, Reser's Fine Foods and Dole Fresh. That's everything from frozen ice cream at -20°F to fresh produce at 36°F.

We know the cold chain, the delivery windows and the rejection risk that come with that freight, and we build capacity around it.

Would you have a few minutes for a quick intro on your temperature-controlled lanes?

${LOCKED_FIRST_TOUCH_SIGNATURE}`,
    );
    assert.match(rendered.body, /248-318-6170$/);
    assert.match(rendered.body, /850-692-2511 x 148\n248-318-6170/);
    assert.doesNotMatch(rendered.body, /hook_line|Hi Elena|15 minutes|elbertalogistics\.com\/services|850-702-9224|Business Development|^Best,/m);
    assert.doesNotMatch(
      rendered.body,
      /I'm reaching out|freight solutions company|over 15 years|capabilities align|supply chain strategy|Thank you,|International Solutions LLC/,
    );
  });

  it("renders the raw materials, chemical, and manufacturing bodies exactly", () => {
    const steel = fillLockedFirstTouch({
      company: "Ironwood Steel Supply",
      industry: "Metals",
    });
    assert.equal(steel.subject, "Coil and tubing freight for Ironwood Steel Supply");
    assert.match(steel.body, /^Hello,\n\nMax Bacon here with Elberta Logistics/);
    assert.match(steel.body, /Gerdau, Constellium and Reliance/);
    assert.match(steel.body, /If you're moving coil or tubing, would you be open to a short call\?/);
    assert.match(steel.body, /Thanks,\n\nMaxwell Bacon\nDirector of Customer Sales, Elberta Logistics/);
    assert.doesNotMatch(steel.body, /International Solutions LLC|Thank you,/);

    const coatings = fillLockedFirstTouch({
      company: "Gulf Coatings",
      industry: "Coatings",
    });
    assert.equal(coatings.subject, "Hazmat and solvent freight for Gulf Coatings");
    assert.match(coatings.body, /^Hello,\n\nThis is Max Bacon with Elberta Logistics/);
    assert.match(coatings.body, /Sherwin-Williams, AkzoNobel and Trinseo/);
    assert.match(coatings.body, /If you've got a few minutes, I'd like a quick intro on how you're covering that freight\./);

    const mill = fillLockedFirstTouch({
      company: "Oakridge Furniture Works",
      industry: "Furniture manufacturing",
    });
    assert.equal(mill.subject, "Manufacturing freight support for Oakridge Furniture Works");
    assert.match(mill.body, /^Hello,\n\nMax with Elberta Logistics/);
    assert.match(mill.body, /Adient, Flex-N-Gate and OpMobility/);
    assert.match(mill.body, /Woodgrain, Stella-Jones and Weyerhaeuser/);
    assert.match(mill.body, /Would you be open to a short intro to talk through your lanes\?/);
  });

  it("keeps proof facts but does not reuse one opener or CTA across verticals", () => {
    const food = fillLockedFirstTouch(foodVars).body;
    const steel = fillLockedFirstTouch({ company: "Ironwood Steel Supply", industry: "Metals" }).body;
    const chemical = fillLockedFirstTouch({ company: "Gulf Coatings", industry: "Coatings" }).body;
    const mill = fillLockedFirstTouch({
      company: "Oakridge Furniture Works",
      industry: "Furniture manufacturing",
    }).body;

    const openers = [food, steel, chemical, mill].map((body) => body.split("\n\n")[1] ?? "");
    assert.equal(new Set(openers).size, 4);
    const asks = [food, steel, chemical, mill].map((body) => body.split("\n\n")[3] ?? "");
    assert.equal(new Set(asks).size, 4);
    for (const body of [food, steel, chemical, mill]) {
      assert.doesNotMatch(
        body,
        /I'm reaching out|freight solutions company|over 15 years|capabilities align|current supply chain strategy/,
      );
    }
  });

  it("keeps the locked signature even when settings name and phone differ", () => {
    const rendered = fillLockedFirstTouch({
      company: "Named Decision Co",
      industry: "Food processing",
      senderName: "Jim",
      senderPhone: "850-702-9224",
      hookLine: "internal note only",
      firstName: "Rita",
    });
    assert.match(rendered.body, /Maxwell Bacon/);
    assert.match(rendered.body, /248-318-6170$/);
    assert.match(rendered.body, /^Hello Rita,\n\nThis is Max with Elberta Logistics/);
    assert.doesNotMatch(rendered.body, /Jim|850-702-9224|internal note only/);
  });

  it("falls back to Hello, for missing, desk, and department first names", () => {
    const desks = [
      "",
      "   ",
      "Shipping",
      "Sales",
      "Traffic",
      "Logistics",
      "Desk",
      "Team",
      "Coordinator",
      "Shipping Desk",
      "Sales Desk",
      "Traffic Desk",
      "Lincoln Logistics Desk",
      "Sinton Dispatch",
      "john.smith",
      "shipping@plant.example",
    ];
    for (const firstName of desks) {
      const rendered = fillLockedFirstTouch({
        company: "Desk Label Co",
        industry: "Food processing",
        firstName,
      });
      assert.match(rendered.body, /^Hello,\n\nThis is Max with Elberta Logistics/);
      assert.doesNotMatch(rendered.body, /Hello (Shipping|Sales|Traffic|Logistics|Desk|Team|Coordinator|John)/);
      assert.doesNotMatch(rendered.body, /john\.smith|shipping@/i);
    }
  });

  it("does not invent a greeting from an email local-part that is not the contact first name", () => {
    const rendered = fillLockedFirstTouch({
      company: "Local Part Co",
      industry: "Furniture manufacturing",
    });
    assert.match(rendered.body, /^Hello,\n\nMax with Elberta Logistics/);
    assert.doesNotMatch(rendered.body, /Hello \{\{FirstName\}\}/);
  });

  it("does not treat a rewritten body as locked", () => {
    const rendered = fillLockedFirstTouch(foodVars);
    assert.equal(isLockedFirstTouch(rendered.subject, rendered.body, foodVars), true);
    assert.equal(
      isLockedFirstTouch(rendered.subject, `${rendered.body}\nCan I visit your warehouse?`, foodVars),
      false,
    );
  });
});

describe("person first-name greeting", () => {
  it("keeps real person names and rejects desk labels", () => {
    assert.equal(personFirstName("Elena"), "Elena");
    assert.equal(personFirstName("Marcus"), "Marcus");
    assert.equal(personFirstName("Mary Ann"), "Mary Ann");
    assert.equal(personFirstName("jean-luc"), "Jean-Luc");
    assert.equal(personFirstName("ELENA"), "Elena");
    assert.equal(personFirstName("Shipping"), null);
    assert.equal(personFirstName("Coordinator"), null);
    assert.equal(personFirstName("Lincoln Logistics Desk"), null);
    assert.equal(personFirstName("Sinton Dispatch"), null);
    assert.equal(personFirstName("john.smith"), null);
    assert.equal(firstTouchGreeting("Rita"), "Hello Rita,");
    assert.equal(firstTouchGreeting("Shipping Desk"), "Hello,");
    assert.equal(firstTouchGreeting(""), "Hello,");
  });
});
