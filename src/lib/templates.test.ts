import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOCKED_FIRST_TOUCH_SIGNATURE } from "./constants";
import { fillLockedFirstTouch, isLockedFirstTouch, selectVertical } from "./templates";

const foodVars = {
  company: "Pinecrest Produce Co.",
  industry: "Produce / food",
  notes: "Seasonal outbound produce into the Southeast.",
  name: "Pinecrest Produce Co.",
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
      `I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with food and beverage shippers such as Perdue, Tillamook, Reser's Fine Foods and Dole Fresh, moving everything from frozen ice cream at -20°F to fresh produce at 36°F.

We understand the cold chain, the delivery windows and the rejection risk that come with your products, and we build our capacity around them.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?

${LOCKED_FIRST_TOUCH_SIGNATURE}`,
    );
    assert.match(rendered.body, /248-318-6170$/);
    assert.match(rendered.body, /850-692-2511 x 148\n248-318-6170/);
    assert.doesNotMatch(rendered.body, /hook_line|Hi Elena|15 minutes|elbertalogistics\.com\/services|850-702-9224|Business Development|^Best,/m);
  });

  it("renders the raw materials, chemical, and manufacturing bodies exactly", () => {
    const steel = fillLockedFirstTouch({
      company: "Ironwood Steel Supply",
      industry: "Metals",
    });
    assert.equal(steel.subject, "Coil and tubing freight for Ironwood Steel Supply");
    assert.match(steel.body, /Gerdau, Constellium and Reliance/);
    assert.match(steel.body, /Thank you,\n\nMaxwell Bacon\nDirector of Customer Sales, Elberta Logistics International Solutions LLC/);

    const coatings = fillLockedFirstTouch({
      company: "Gulf Coatings",
      industry: "Coatings",
    });
    assert.equal(coatings.subject, "Hazmat and solvent freight for Gulf Coatings");
    assert.match(coatings.body, /Sherwin-Williams, AkzoNobel and Trinseo/);

    const mill = fillLockedFirstTouch({
      company: "Oakridge Furniture Works",
      industry: "Furniture manufacturing",
    });
    assert.equal(mill.subject, "Manufacturing freight support for Oakridge Furniture Works");
    assert.match(mill.body, /Adient, Flex-N-Gate and OpMobility/);
    assert.match(mill.body, /Woodgrain, Stella-Jones and Weyerhaeuser/);
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
    assert.doesNotMatch(rendered.body, /Jim|850-702-9224|internal note only|Rita/);
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
