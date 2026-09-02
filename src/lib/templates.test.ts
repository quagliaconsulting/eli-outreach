import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PACKET_URL } from "./constants";
import { fillLockedFirstTouch, isLockedFirstTouch } from "./templates";

const vars = {
  company: "Pinecrest Produce Co.",
  firstName: "Elena",
  hookLine: "you move produce out of south Georgia and likely need dry van coverage",
  senderName: "Max",
  senderPhone: "850-702-9224",
};

describe("locked first-touch template", () => {
  it("renders the locked subject and body", () => {
    const rendered = fillLockedFirstTouch(vars);
    assert.equal(rendered.subject, "Pinecrest Produce Co. truckload capacity — 15 minutes?");
    assert.match(rendered.body, /^Hi Elena,/);
    assert.match(rendered.body, /I am with Elberta Logistics International \(ELI\)\./);
    assert.match(rendered.body, /I am reaching out because you move produce out of south Georgia and likely need dry van coverage\./);
    assert.match(rendered.body, new RegExp(PACKET_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(rendered.body, /Best,\nMax\nBusiness Development\nElberta Logistics International\n850-702-9224$/);
  });

  it("does not treat a rewritten body as locked", () => {
    const rendered = fillLockedFirstTouch(vars);
    assert.equal(isLockedFirstTouch(rendered.subject, rendered.body, vars), true);
    assert.equal(
      isLockedFirstTouch(rendered.subject, rendered.body + "\nCan I visit your warehouse?", vars),
      false,
    );
  });
});
