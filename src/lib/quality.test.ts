import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyEmail,
  scoreLead,
  tierForScore,
  type QualityContact,
  type QualitySource,
} from "./quality";

const plant: QualitySource = {
  industry: "Produce / food",
  city: "Bainbridge",
  state: "GA",
  phone: "229-555-0142",
  website: "https://plant.example",
  notes: "Seasonal outbound produce into the Southeast.",
};

const manager: QualityContact = {
  first_name: "John",
  last_name: "Carter",
  title: "Transportation Manager",
  phone: "229-555-0142",
  email: "john.carter@plant.example",
};

function score(overrides: {
  company?: Partial<QualitySource>;
  contact?: Partial<QualityContact> | null;
} = {}) {
  const company = { ...plant, ...overrides.company };
  const contact = overrides.contact === null ? null : { ...manager, ...overrides.contact };
  return scoreLead(company, contact);
}

describe("email quality ordering", () => {
  it("ranks named personal email above a generic inbox, which ranks above no email", () => {
    const named = score({ contact: { email: "john.carter@plant.example" } });
    const generic = score({ contact: { email: "shipping@plant.example" } });
    const dispatch = score({ contact: { email: "dispatch@plant.example" } });
    const sales = score({ contact: { email: "sales@plant.example" } });
    const none = score({ contact: { email: null } });

    assert.equal(classifyEmail("john.carter@plant.example", "John", "Carter"), "named");
    assert.equal(classifyEmail("john@plant.example", "John", "Carter"), "named");
    assert.equal(classifyEmail("shipping@plant.example", "John", "Carter"), "generic");
    assert.equal(classifyEmail("dispatch@plant.example"), "generic");
    assert.equal(classifyEmail("sales@plant.example"), "generic");
    assert.equal(classifyEmail(null), "none");

    assert.ok(named.score > generic.score);
    assert.ok(generic.score > none.score);
    assert.equal(generic.score, dispatch.score);
    assert.equal(generic.score, sales.score);
    assert.match(named.reason, /Named work email/);
    assert.match(generic.reason, /Generic shipping inbox/);
    assert.match(none.reason, /No email on file/);
  });

  it("ranks a named email above another published work email, which ranks above a generic inbox", () => {
    const named = score({ contact: { email: "john@plant.example" } });
    const otherWork = score({ contact: { email: "desk42@plant.example" } });
    const generic = score({ contact: { email: "shipping@plant.example" } });

    assert.equal(classifyEmail("desk42@plant.example", "John", "Carter"), "work");
    assert.ok(named.score > otherWork.score);
    assert.ok(otherWork.score > generic.score);
  });
});

describe("named person vs switchboard", () => {
  it("scores a named transportation person above a switchboard-only Shipping row", () => {
    const named = score({
      contact: {
        first_name: "Marcus",
        last_name: "Hale",
        title: "Shipping Supervisor",
        email: null,
      },
    });
    const board = score({
      contact: {
        first_name: "Shipping",
        last_name: "",
        title: "Board",
        email: null,
      },
    });

    assert.ok(named.score > board.score);
    assert.match(named.reason, /Shipping Supervisor/);
    assert.match(board.reason, /switchboard-only/);
    assert.equal(board.tier, "C");
  });

  it("scores a named adjacent operations title below a transportation title and above switchboard", () => {
    const transport = score({ contact: { title: "Logistics Manager", email: null } });
    const adjacent = score({ contact: { title: "Plant Manager", email: null } });
    const board = score({
      contact: { first_name: "Shipping", last_name: "", title: "Shipping", email: null },
    });

    assert.ok(transport.score > adjacent.score);
    assert.ok(adjacent.score > board.score);
  });
});

describe("title seniority, completeness, lane, and freight fit", () => {
  it("scores a transportation director above a transportation coordinator", () => {
    const director = score({ contact: { title: "Director of Logistics", email: null } });
    const coordinator = score({ contact: { title: "Transportation Coordinator", email: null } });
    assert.ok(director.score > coordinator.score);
  });

  it("raises the score when direct phone, plant city, and company site are all present", () => {
    const complete = score({
      company: { phone: "229-555-0100", city: "Bainbridge", website: "https://plant.example" },
      contact: { phone: "229-555-0142", email: null },
    });
    const thin = score({
      company: { phone: null, city: "", website: null },
      contact: { phone: null, email: null },
    });
    assert.ok(complete.score > thin.score);
  });

  it("raises core ELI-lane states and lowers far-from-lane locations", () => {
    const georgia = score({ company: { state: "GA", city: "Bainbridge" }, contact: { email: null } });
    const texas = score({ company: { state: "TX", city: "Dallas" }, contact: { email: null } });
    const california = score({ company: { state: "CA", city: "Fresno" }, contact: { email: null } });
    assert.ok(georgia.score > california.score);
    assert.ok(texas.score > california.score);
    assert.match(california.reason, /far from ELI lanes/);
  });

  it("raises freight-fit industries over unrelated ones", () => {
    const produce = score({
      company: { industry: "Produce / food", notes: "" },
      contact: { email: null },
    });
    const paper = score({
      company: { industry: "Corrugated packaging", notes: "" },
      contact: { email: null },
    });
    const textiles = score({
      company: { industry: "Textiles", notes: "" },
      contact: { email: null },
    });
    assert.ok(produce.score > textiles.score);
    assert.ok(paper.score > textiles.score);
  });
});

describe("tier and bounds", () => {
  it("returns a 0-100 score, A/B/C tier, and a short reason", () => {
    const high = score();
    const low = score({
      company: { industry: "", city: "", state: "CA", phone: null, website: null, notes: "" },
      contact: { first_name: "Shipping", last_name: "", title: "", phone: null, email: null },
    });

    assert.ok(high.score >= 70);
    assert.equal(high.tier, "A");
    assert.ok(high.reason.length > 10);
    assert.ok(low.score < 45);
    assert.equal(low.tier, "C");
    assert.equal(tierForScore(70), "A");
    assert.equal(tierForScore(69), "B");
    assert.equal(tierForScore(45), "B");
    assert.equal(tierForScore(44), "C");
    assert.ok(high.score <= 100);
    assert.ok(low.score >= 0);
  });
});
