import { FROM_EMAIL } from "./constants";

const TRUTHY = new Set(["1", "true", "yes", "on"]);

function envString(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function envFlag(name: string): boolean {
  return TRUTHY.has(envString(name).toLowerCase());
}

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
};

/** SMTP password from env only. Never log or return this from health/APIs. */
export function readSmtpPass(): string {
  return envString("SMTP_PASS");
}

export function getSmtpConfig(): SmtpConfig | null {
  const pass = readSmtpPass();
  if (!pass) return null;

  const host = envString("SMTP_HOST") || "mail.privateemail.com";
  const portRaw = envString("SMTP_PORT") || "465";
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) return null;

  const user = envString("SMTP_USER") || FROM_EMAIL;
  const secureRaw = envString("SMTP_SECURE").toLowerCase();
  const secure = secureRaw ? envFlag("SMTP_SECURE") : port === 465;

  return { host, port, secure, user };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

/**
 * Send is on only when the operator set SEND_ENABLED and SMTP_PASS
 * (plus a usable host/port/user). Missing either keeps copy-only Approve.
 */
export function isSendEnabled(): boolean {
  return envFlag("SEND_ENABLED") && isSmtpConfigured();
}
