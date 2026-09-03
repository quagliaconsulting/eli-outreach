import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { RuleError } from "./types";
import {
  draftToHtml,
  formatFromHeader,
  sendFirstTouchEmail,
  setMailTransporterFactory,
  type OutboundMail,
} from "./mail";

const KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SEND_ENABLED"] as const;
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function restoreEnv(): void {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  setMailTransporterFactory(null);
}

function enableSmtp(): void {
  process.env.SEND_ENABLED = "true";
  process.env.SMTP_HOST = "mail.privateemail.com";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  process.env.SMTP_USER = "max@elbertalogistics.net";
  process.env.SMTP_PASS = "app-password-not-for-repo";
}

afterEach(() => {
  restoreEnv();
});

describe("first-touch SMTP send", () => {
  it("blocks send when there is no published email", async () => {
    enableSmtp();
    const sent: OutboundMail[] = [];
    setMailTransporterFactory(() => ({
      async sendMail(mail) {
        sent.push(mail);
        return { messageId: "should-not-send" };
      },
    }));

    await assert.rejects(
      () =>
        sendFirstTouchEmail({
          to: null,
          subject: "Acme truckload capacity — 15 minutes?",
          text: "Hi Pat,\nLocked draft.",
          senderName: "Max",
        }),
      (error: unknown) => error instanceof RuleError && error.code === "no_email_on_file",
    );
    await assert.rejects(
      () =>
        sendFirstTouchEmail({
          to: "   ",
          subject: "Acme truckload capacity — 15 minutes?",
          text: "Hi Pat,\nLocked draft.",
          senderName: "Max",
        }),
      (error: unknown) => error instanceof RuleError && error.code === "no_email_on_file",
    );
    assert.equal(sent.length, 0);
  });

  it("blocks send when SEND_ENABLED is false", async () => {
    enableSmtp();
    process.env.SEND_ENABLED = "false";
    const sent: OutboundMail[] = [];
    setMailTransporterFactory(() => ({
      async sendMail(mail) {
        sent.push(mail);
        return { messageId: "should-not-send" };
      },
    }));

    await assert.rejects(
      () =>
        sendFirstTouchEmail({
          to: "pat.lee@published-shipper.com",
          subject: "Acme truckload capacity — 15 minutes?",
          text: "Hi Pat,\nLocked draft.",
          senderName: "Max",
        }),
      (error: unknown) => error instanceof RuleError && error.code === "send_disabled",
    );
    assert.equal(sent.length, 0);
  });

  it("blocks send when SMTP_PASS is missing", async () => {
    enableSmtp();
    delete process.env.SMTP_PASS;
    const sent: OutboundMail[] = [];
    setMailTransporterFactory(() => ({
      async sendMail(mail) {
        sent.push(mail);
        return { messageId: "should-not-send" };
      },
    }));

    await assert.rejects(
      () =>
        sendFirstTouchEmail({
          to: "pat.lee@published-shipper.com",
          subject: "Acme truckload capacity — 15 minutes?",
          text: "Hi Pat,\nLocked draft.",
          senderName: "Max",
        }),
      (error: unknown) => error instanceof RuleError && error.code === "send_disabled",
    );
    assert.equal(sent.length, 0);
  });

  it("sends the locked draft through a mocked transporter", async () => {
    enableSmtp();
    const sent: OutboundMail[] = [];
    setMailTransporterFactory(() => ({
      async sendMail(mail) {
        sent.push(mail);
        return { messageId: "mock-1" };
      },
    }));

    const body = "Hi Pat,\nI am with Elberta Logistics International (ELI).";
    const mail = await sendFirstTouchEmail({
      to: "Pat.Lee@published-shipper.com",
      subject: "Published Email Shipper truckload capacity — 15 minutes?",
      text: body,
      senderName: "Max",
    });

    assert.equal(sent.length, 1);
    assert.equal(mail.to, "pat.lee@published-shipper.com");
    assert.equal(mail.from, "Max <max@elbertalogistics.net>");
    assert.equal(mail.replyTo, "max@elbertalogistics.net");
    assert.equal(mail.subject, "Published Email Shipper truckload capacity — 15 minutes?");
    assert.equal(mail.text, body);
    assert.match(mail.html, /Hi Pat,/);
    assert.doesNotMatch(mail.from, /sales@/i);
    assert.doesNotMatch(mail.replyTo, /sales@/i);
    assert.deepEqual(sent[0], mail);
  });

  it("uses the sender name setting in the From display name", () => {
    assert.equal(formatFromHeader("Jim"), "Jim <max@elbertalogistics.net>");
    assert.equal(formatFromHeader("  "), "Max <max@elbertalogistics.net>");
  });

  it("escapes HTML in the optional simple HTML body", () => {
    assert.equal(
      draftToHtml("Hi <Pat> & team"),
      '<div style="font-family:Georgia,Times,serif;font-size:14px;line-height:1.5;white-space:pre-wrap;">Hi &lt;Pat&gt; &amp; team</div>',
    );
  });
});
