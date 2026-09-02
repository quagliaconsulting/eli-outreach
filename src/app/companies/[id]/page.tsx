"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmailOnFile,
  ErrorNote,
  ExampleStamp,
  Field,
  Pill,
  inputClassName,
  stageLabel,
  stageTone,
} from "@/components/ui";
import { api } from "@/lib/client";
import { COMPANY_STAGES, type CompanyStage } from "@/lib/constants";
import type { Activity, CompanyWithContacts } from "@/lib/types";

export default function CompanyPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [company, setCompany] = useState<CompanyWithContacts | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [callNote, setCallNote] = useState("");
  const [hook, setHook] = useState("");
  const [crmProfile, setCrmProfile] = useState("");
  const [crmNotes, setCrmNotes] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dncReason, setDncReason] = useState("");

  async function load() {
    try {
      const [next, log] = await Promise.all([
        api<CompanyWithContacts>(`/api/companies/${id}`),
        api<{ activities: Activity[] }>(`/api/companies/${id}/activities`),
      ]);
      setCompany(next);
      setActivities(log.activities);
      setCrmProfile(next.crm?.freight_profile ?? "");
      setCrmNotes(next.crm?.decision_notes ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company");
    }
  }

  useEffect(() => {
    if (Number.isFinite(id)) void load();
  }, [id]);

  async function setStage(stage: CompanyStage) {
    try {
      await api(`/api/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stage update failed");
    }
  }

  if (!company) return <p className="text-ink-muted">Loading account…</p>;
  const contact = company.contacts.find((c) => c.is_primary) ?? company.contacts[0];
  const crmOpen = company.stage === "replied";

  return (
    <div className="space-y-6">
      <Link href="/pipeline" className="text-sm underline">
        Back to pipeline
      </Link>
      <header className="relative">
        {company.is_example ? <ExampleStamp className="absolute right-0 top-0" /> : null}
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">{company.industry}</p>
        <h1 className="font-serif text-4xl">{company.name}</h1>
        <p className="mt-1 text-ink-muted">
          {company.city}, {company.state}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone={stageTone(company.stage)}>{stageLabel(company.stage)}</Pill>
          {company.dnc ? <Pill tone="stamp">DNC</Pill> : null}
          {company.is_example ? <Pill tone="gold">Example data</Pill> : null}
        </div>
      </header>
      <ErrorNote message={error} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="font-serif text-2xl">Stage</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMPANY_STAGES.filter((stage) => stage !== "dnc").map((stage) => (
              <Button
                key={stage}
                tone={company.stage === stage ? "navy" : "ghost"}
                onClick={() => void setStage(stage)}
              >
                {stageLabel(stage)}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-muted">{company.notes}</p>
          <p className="mt-2 font-mono text-sm">{company.phone || "No company phone"}</p>
        </Card>

        <Card>
          <h2 className="font-serif text-2xl">Primary contact</h2>
          {contact ? (
            <div className="mt-3 space-y-1 text-sm">
              <p className="font-medium">
                {contact.first_name} {contact.last_name}
              </p>
              <p className="text-ink-muted">{contact.title}</p>
              <p className="font-mono">{contact.phone || "No phone"}</p>
              <EmailOnFile email={contact.email} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No contact on file.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-serif text-2xl">Log a call</h2>
          <textarea
            className={inputClassName("mt-3 min-h-[88px]")}
            value={callNote}
            onChange={(event) => setCallNote(event.target.value)}
            placeholder="What happened on the phone?"
          />
          <div className="mt-3">
            <Button
              onClick={async () => {
                try {
                  await api(`/api/companies/${id}/call`, {
                    method: "POST",
                    body: JSON.stringify({ contact_id: contact?.id ?? null, notes: callNote }),
                  });
                  setCallNote("");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Call log failed");
                }
              }}
            >
              Log call
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-2xl">First-touch draft</h2>
          <Field label="Hook line" hint="Locked template. No LTL lead. No site visit.">
            <textarea
              className={inputClassName("min-h-[88px]")}
              value={hook}
              onChange={(event) => setHook(event.target.value)}
            />
          </Field>
          <div className="mt-3">
            <Button
              disabled={!contact || !hook.trim()}
              onClick={async () => {
                try {
                  await api("/api/drafts", {
                    method: "POST",
                    body: JSON.stringify({
                      company_id: id,
                      contact_id: contact?.id,
                      hook_line: hook,
                    }),
                  });
                  setHook("");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Draft failed");
                }
              }}
            >
              Generate draft
            </Button>
            <Link href="/campaigns" className="ml-3 text-sm underline">
              Open campaigns
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-2xl">CRM</h2>
        {crmOpen ? (
          <>
            <p className="mt-1 text-sm text-forest">Unlocked because status is Replied.</p>
            <div className="mt-3 grid gap-3">
              <Field label="Freight profile">
                <textarea
                  className={inputClassName("min-h-[80px]")}
                  value={crmProfile}
                  onChange={(event) => setCrmProfile(event.target.value)}
                />
              </Field>
              <Field label="Decision notes">
                <textarea
                  className={inputClassName("min-h-[80px]")}
                  value={crmNotes}
                  onChange={(event) => setCrmNotes(event.target.value)}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Button
                tone="forest"
                onClick={async () => {
                  try {
                    await api(`/api/companies/${id}/crm`, {
                      method: "POST",
                      body: JSON.stringify({
                        freight_profile: crmProfile,
                        decision_notes: crmNotes,
                      }),
                    });
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "CRM save failed");
                  }
                }}
              >
                Save CRM
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">
            CRM is locked until this account is marked Replied. Do not keep a shadow CRM from first-touch.
          </p>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-serif text-2xl">Add contact</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="First name">
              <input className={inputClassName()} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </Field>
            <Field label="Last name">
              <input className={inputClassName()} value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </Field>
            <Field label="Title">
              <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={inputClassName()} value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Email" hint="Only if you actually have it. Leave blank otherwise.">
              <input className={inputClassName()} value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Button
              onClick={async () => {
                try {
                  await api("/api/contacts", {
                    method: "POST",
                    body: JSON.stringify({
                      company_id: id,
                      first_name: firstName,
                      last_name: lastName,
                      title,
                      phone,
                      email: email.trim() || null,
                    }),
                  });
                  setFirstName("");
                  setLastName("");
                  setTitle("");
                  setPhone("");
                  setEmail("");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Contact failed");
                }
              }}
            >
              Add contact
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-2xl">Move to DNC</h2>
          <Field label="Reason">
            <input className={inputClassName()} value={dncReason} onChange={(event) => setDncReason(event.target.value)} />
          </Field>
          <div className="mt-3">
            <Button
              tone="danger"
              disabled={!dncReason.trim()}
              onClick={async () => {
                try {
                  await api("/api/dnc", {
                    method: "POST",
                    body: JSON.stringify({
                      company_id: id,
                      contact_id: contact?.id ?? null,
                      email: contact?.email ?? null,
                      phone: contact?.phone ?? company.phone,
                      reason: dncReason,
                    }),
                  });
                  setDncReason("");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "DNC failed");
                }
              }}
            >
              Block first-touch
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-2xl">Activity</h2>
        <ul className="mt-3 space-y-2">
          {activities.map((item) => (
            <li key={item.id} className="rule-row py-2 text-sm">
              <span className="font-medium">{item.type}</span>
              <span className="text-ink-muted"> · {new Date(item.created_at).toLocaleString("en-US", { timeZone: "America/New_York" })}</span>
              <p>{item.notes}</p>
            </li>
          ))}
          {activities.length === 0 ? <li className="text-sm text-ink-muted">No activity yet.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
