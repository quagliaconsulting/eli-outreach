import type { CompanyStage, DraftStatus } from "./constants";

export type Settings = {
  id: number;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  sender_phone: string;
  timezone: string;
  packet_url: string;
  fleet_counts_enabled: number;
};

export type Company = {
  id: number;
  name: string;
  industry: string;
  city: string;
  state: string;
  phone: string | null;
  website: string | null;
  notes: string;
  stage: CompanyStage;
  is_example: number;
  next_action_type: "call" | "email" | "follow_up" | "none";
  next_action_at: string | null;
  last_touch_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  title: string;
  phone: string | null;
  email: string | null;
  is_primary: number;
  is_example: number;
};

export type Draft = {
  id: number;
  company_id: number;
  contact_id: number;
  kind: "first_touch" | "follow_up";
  subject: string;
  body: string;
  hook_line: string;
  status: DraftStatus;
  blocked_reason: string | null;
  created_at: string;
  approved_at: string | null;
  copied_at: string | null;
  sent_at: string | null;
};

export type DncEntry = {
  id: number;
  company_id: number | null;
  contact_id: number | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  reason: string;
  created_at: string;
};

export type Activity = {
  id: number;
  company_id: number;
  contact_id: number | null;
  type: string;
  notes: string;
  created_at: string;
};

export type CrmRecord = {
  id: number;
  company_id: number;
  freight_profile: string;
  decision_notes: string;
  next_meeting_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyWithContacts = Company & {
  contacts: Contact[];
  dnc: boolean;
  crm: CrmRecord | null;
};

export type DraftView = Draft & {
  company_name: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_example: number;
};

export class RuleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "RuleError";
  }
}
