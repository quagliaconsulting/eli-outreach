import nodemailer from "nodemailer";
import { DEFAULT_SENDER_NAME, FROM_EMAIL, REPLY_TO_EMAIL } from "./constants";
import { displayEmail } from "./rules";
import { getSmtpConfig, isSendEnabled, readSmtpPass } from "./smtp";
import { RuleError } from "./types";

export type OutboundMail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

export type MailTransporter = {
  sendMail(mail: OutboundMail): Promise<unknown>;
};

export type SendFirstTouchInput = {
  to: string | null | undefined;
  subject: string;
  text: string;
  senderName: string;
};

type TransporterFactory = () => MailTransporter;

function defaultTransporterFactory(): MailTransporter {
  const config = getSmtpConfig();
  if (!config) {
    throw new RuleError("SMTP is not configured.", "smtp_not_configured");
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: readSmtpPass(),
    },
  });
}

let transporterFactory: TransporterFactory = defaultTransporterFactory;

export function setMailTransporterFactory(factory: TransporterFactory | null): void {
  transporterFactory = factory ?? defaultTransporterFactory;
}

export function formatFromHeader(senderName: string): string {
  const name = senderName.trim() || DEFAULT_SENDER_NAME;
  return `${name} <${FROM_EMAIL}>`;
}

export function draftToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Georgia,Times,serif;font-size:14px;line-height:1.5;white-space:pre-wrap;">${escaped}</div>`;
}

function assertLockedIdentity(mail: OutboundMail): void {
  if (!mail.from.endsWith(`<${FROM_EMAIL}>`) || mail.replyTo !== REPLY_TO_EMAIL) {
    throw new RuleError(
      `From / Reply-To must be ${FROM_EMAIL}.`,
      "from_locked",
    );
  }
  if (/sales@/i.test(mail.from) || /sales@/i.test(mail.replyTo)) {
    throw new RuleError("Do not send first-touch as sales@.", "from_locked");
  }
}

export async function sendFirstTouchEmail(input: SendFirstTouchInput): Promise<OutboundMail> {
  if (!isSendEnabled()) {
    throw new RuleError(
      "Email send is off. Set SEND_ENABLED and SMTP_PASS to send from this console.",
      "send_disabled",
    );
  }

  const to = displayEmail(input.to);
  if (!to) {
    throw new RuleError(
      "No email on file. Do not invent one. Send is blocked.",
      "no_email_on_file",
    );
  }

  const mail: OutboundMail = {
    from: formatFromHeader(input.senderName),
    to,
    replyTo: REPLY_TO_EMAIL,
    subject: input.subject,
    text: input.text,
    html: draftToHtml(input.text),
  };
  assertLockedIdentity(mail);

  await transporterFactory().sendMail(mail);
  return mail;
}
