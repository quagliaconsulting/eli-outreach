import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getSmtpConfig, isSendEnabled, isSmtpConfigured, readSmtpPass } from "./smtp";

const KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_FROM",
  "SMTP_PASS",
  "SEND_ENABLED",
] as const;

const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function setEnv(vars: Partial<Record<(typeof KEYS)[number], string | undefined>>): void {
  for (const key of KEYS) {
    if (key in vars) {
      const value = vars[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function restoreEnv(): void {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnv();
});

describe("SMTP env config", () => {
  it("is not configured or enabled without SMTP_PASS", () => {
    setEnv({
      SEND_ENABLED: "true",
      SMTP_HOST: "mail.privateemail.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "max@elbertalogistics.net",
      SMTP_PASS: undefined,
    });
    assert.equal(readSmtpPass(), "");
    assert.equal(getSmtpConfig(), null);
    assert.equal(isSmtpConfigured(), false);
    assert.equal(isSendEnabled(), false);
  });

  it("is configured but not enabled when SEND_ENABLED is false", () => {
    setEnv({
      SEND_ENABLED: "false",
      SMTP_HOST: "mail.privateemail.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "max@elbertalogistics.net",
      SMTP_PASS: "app-password-not-for-repo",
    });
    assert.equal(isSmtpConfigured(), true);
    assert.equal(isSendEnabled(), false);
    const config = getSmtpConfig();
    assert.ok(config);
    assert.equal(config.host, "mail.privateemail.com");
    assert.equal(config.port, 465);
    assert.equal(config.secure, true);
    assert.equal(config.user, "max@elbertalogistics.net");
    assert.equal("pass" in config, false);
  });

  it("enables send only when SEND_ENABLED is true and SMTP_PASS is set", () => {
    setEnv({
      SEND_ENABLED: "true",
      SMTP_PASS: "app-password-not-for-repo",
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_SECURE: undefined,
      SMTP_USER: undefined,
    });
    assert.equal(isSendEnabled(), true);
    const config = getSmtpConfig();
    assert.deepEqual(config, {
      host: "mail.privateemail.com",
      port: 465,
      secure: true,
      user: "max@elbertalogistics.net",
    });
  });

  it("uses STARTTLS defaults when port is 587 and SMTP_SECURE is unset", () => {
    setEnv({
      SEND_ENABLED: "true",
      SMTP_PASS: "app-password-not-for-repo",
      SMTP_PORT: "587",
      SMTP_SECURE: undefined,
    });
    const config = getSmtpConfig();
    assert.ok(config);
    assert.equal(config.port, 587);
    assert.equal(config.secure, false);
  });

  it("never puts the password on the public config object", () => {
    setEnv({ SEND_ENABLED: "true", SMTP_PASS: "super-secret-value" });
    const serialized = JSON.stringify(getSmtpConfig());
    assert.doesNotMatch(serialized, /super-secret-value/);
    assert.doesNotMatch(serialized, /SMTP_PASS/);
  });
});
