"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmailOnFile, ErrorNote, ExampleStamp, Pill } from "@/components/ui";
import { api } from "@/lib/client";
import { FROM_EMAIL, REPLY_TO_EMAIL } from "@/lib/constants";
import type { LeadSort, LeadTier, Settings, Workstation, WorkstationFilter } from "@/lib/types";

function draftTone(status: string | undefined): "gold" | "forest" | "ink" | "muted" {
  if (status === "draft") return "gold";
  if (status === "approved" || status === "copied") return "forest";
  if (status === "sent") return "ink";
  return "muted";
}

function chipClass(active: boolean): string {
  return `rounded-full px-3 py-1 text-xs ${active ? "bg-navy text-paper" : "bg-white text-ink-muted"}`;
}

function tierTone(tier: LeadTier): "forest" | "gold" | "muted" {
  if (tier === "A") return "forest";
  if (tier === "B") return "gold";
  return "muted";
}

export default function LeadsPage() {
  const [board, setBoard] = useState<Workstation | null>(null);
  const [filter, setFilter] = useState<WorkstationFilter>("open");
  const [sort, setSort] = useState<LeadSort>("quality");
  const [emailOnly, setEmailOnly] = useState(false);
  const [tier, setTier] = useState<LeadTier | "">("");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const params = new URLSearchParams({ filter, sort });
      if (emailOnly) params.set("email", "1");
      if (tier) params.set("tier", tier);
      const data = await api<Workstation>(`/api/leads?${params}`);
      setBoard(data);
      setSenderName(data.settings.sender_name);
      setSenderPhone(data.settings.sender_phone);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    }
  }

  useEffect(() => {
    void load();
  }, [filter, sort, emailOnly, tier]);

  async function saveSettings() {
    try {
      const next = await api<Settings>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          sender_name: senderName,
          sender_phone: senderPhone,
        }),
      });
      setSenderName(next.sender_name);
      setSenderPhone(next.sender_phone);
      setSaved(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save sender");
    }
  }

  async function act(id: number, action: "approve" | "copy" | "mark-sent", draftBody?: string, draftSubject?: string, draftEmail?: string | null) {
    try {
      if (action === "copy") {
        const text = `From: ${FROM_EMAIL}\nReply-To: ${REPLY_TO_EMAIL}\nTo: ${draftEmail || "(no email on file — do not invent)"}\nSubject: ${draftSubject}\n\n${draftBody}`;
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
      }
      await api(`/api/drafts/${id}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (!board) {
    return <p className="text-ink-muted">Loading leads…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Qualified leads</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Named decision-makers with contact info and a locked first-touch draft. Approve, copy, mark sent. There is no Send.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chipClass(filter === "open")} onClick={() => setFilter("open")}>
            Open {board.counts.open}
          </button>
          <button type="button" className={chipClass(filter === "sent")} onClick={() => setFilter("sent")}>
            Sent {board.counts.sent}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Sort</span>
          <button type="button" className={chipClass(sort === "quality")} onClick={() => setSort("quality")}>
            Quality
          </button>
          <button type="button" className={chipClass(sort === "added")} onClick={() => setSort("added")}>
            Newest
          </button>
          <button type="button" className={chipClass(sort === "company")} onClick={() => setSort("company")}>
            Company
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Filter</span>
          <button type="button" className={chipClass(emailOnly)} onClick={() => setEmailOnly((on) => !on)}>
            Has email
          </button>
          {(["A", "B", "C"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={chipClass(tier === value)}
              onClick={() => setTier((current) => (current === value ? "" : value))}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[160px] flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Sender name
            <input
              className="mt-1.5 w-full rounded-md border border-paper-rule bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
              value={senderName}
              onChange={(event) => {
                setSenderName(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label className="min-w-[160px] flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Sender phone
            <input
              className="mt-1.5 w-full rounded-md border border-paper-rule bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
              value={senderPhone}
              onChange={(event) => {
                setSenderPhone(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <Button onClick={() => void saveSettings()}>Save</Button>
          {saved ? <span className="self-center text-sm text-forest">Saved</span> : null}
        </div>
      </Card>

      <ErrorNote message={error} />

      <div className="space-y-4">
        {board.leads.map(({ company, contact, draft, quality }) => (
          <Card key={company.id} className="relative">
            {company.is_example ? <ExampleStamp className="absolute right-4 top-4" /> : null}
            <div className="flex flex-wrap items-start justify-between gap-3 pr-24">
              <div>
                <h2 className="font-serif text-2xl">{company.name}</h2>
                <p className="text-sm text-ink-muted">
                  {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
                  {contact.title ? ` · ${contact.title}` : ""}
                  {company.city || company.state ? ` · ${[company.city, company.state].filter(Boolean).join(", ")}` : ""}
                </p>
                <p className="mt-1 text-xs text-ink-faint" title={quality.reason}>
                  {quality.reason}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={tierTone(quality.tier)} title={quality.reason}>
                  {quality.tier}
                </Pill>
                {draft ? (
                  <Pill tone={draftTone(draft.status)}>{draft.status}</Pill>
                ) : (
                  <Pill tone="muted">no draft</Pill>
                )}
              </div>
            </div>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Phone</dt>
                <dd className="font-mono">{contact.phone || company.phone || "No phone on file"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Email</dt>
                <dd>
                  <EmailOnFile email={contact.email} />
                </dd>
              </div>
            </dl>

            {draft ? (
              <>
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Subject</p>
                  <p className="font-medium">{draft.subject}</p>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-navy px-4 py-3 font-mono text-[12px] leading-relaxed text-paper">
                  {draft.body}
                </pre>
                {draft.blocked_reason ? <p className="mt-3 text-sm text-stamp">{draft.blocked_reason}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {draft.status === "draft" ? (
                    <Button tone="forest" onClick={() => void act(draft.id, "approve")}>
                      Approve
                    </Button>
                  ) : null}
                  {draft.status !== "blocked" ? (
                    <Button
                      tone="ghost"
                      onClick={() => void act(draft.id, "copy", draft.body, draft.subject, draft.contact_email)}
                    >
                      {copiedId === draft.id ? "Copied" : "Copy"}
                    </Button>
                  ) : null}
                  {draft.status === "approved" || draft.status === "copied" ? (
                    <Button onClick={() => void act(draft.id, "mark-sent")}>Mark sent</Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">No first-touch draft on file.</p>
            )}
          </Card>
        ))}
        {board.leads.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {filter === "sent"
              ? "No marked-sent drafts yet."
              : emailOnly || tier
                ? "No named decision-maker leads match these filters."
                : "No named decision-maker leads in this list."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
