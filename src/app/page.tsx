"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmailOnFile,
  ErrorNote,
  ExampleStamp,
  Pill,
  stageLabel,
  stageTone,
} from "@/components/ui";
import { api } from "@/lib/client";
import type { CompanyWithContacts, DraftView } from "@/lib/types";

type TodayBoard = {
  calls: Array<{
    company: CompanyWithContacts;
    contact: CompanyWithContacts["contacts"][number] | undefined;
    why: string;
    hasEmail: boolean;
  }>;
  pendingDrafts: DraftView[];
  readyToCopy: DraftView[];
  replied: CompanyWithContacts[];
  counts: {
    working: number;
    next_up: number;
    backfill: number;
    drafts: number;
    dnc: number;
  };
};

export default function TodayPage() {
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<number, string>>({});

  async function load() {
    try {
      setBoard(await api<TodayBoard>("/api/today"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load today");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function logCall(companyId: number, contactId?: number) {
    try {
      await api(`/api/companies/${companyId}/call`, {
        method: "POST",
        body: JSON.stringify({
          contact_id: contactId ?? null,
          notes: note[companyId] || "Logged outreach call.",
        }),
      });
      setNote((current) => ({ ...current, [companyId]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call log failed");
    }
  }

  if (!board) {
    return <p className="text-ink-muted">Loading today’s board…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Today</p>
          <h1 className="font-serif text-4xl">Phone-first queue</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone="forest">{board.counts.working} working</Pill>
          <Pill tone="gold">{board.counts.next_up} next up</Pill>
          <Pill tone="muted">{board.counts.backfill} backfill</Pill>
          <Pill>{board.counts.drafts} drafts</Pill>
          <Pill tone="stamp">{board.counts.dnc} DNC</Pill>
        </div>
      </header>
      <ErrorNote message={error} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl">Call first</h2>
            <Pill tone="forest">Phone-first</Pill>
          </div>
          <div className="space-y-3">
            {board.calls.map(({ company, contact, why, hasEmail }) => (
              <article key={company.id} className="relative rounded-lg border border-paper-rule bg-white/70 p-3">
                {company.is_example ? <ExampleStamp className="absolute right-3 top-3" /> : null}
                <div className="pr-24">
                  <Link href={`/companies/${company.id}`} className="font-serif text-xl hover:underline">
                    {company.name}
                  </Link>
                  <p className="text-sm text-ink-muted">
                    {contact ? `${contact.first_name} ${contact.last_name} · ${contact.title}` : "No contact"}
                    {` · ${company.city}, ${company.state}`}
                  </p>
                  <p className="mt-1 text-sm">{why}</p>
                  <p className="mt-1 font-mono text-sm">{contact?.phone || company.phone || "No phone on file"}</p>
                  <p className="mt-1 text-sm">
                    <EmailOnFile email={hasEmail ? contact?.email : null} />
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <input
                    className="min-w-[220px] flex-1 rounded-md border border-paper-rule px-2 py-1.5 text-sm"
                    placeholder="Call note"
                    value={note[company.id] ?? ""}
                    onChange={(event) =>
                      setNote((current) => ({ ...current, [company.id]: event.target.value }))
                    }
                  />
                  <Button onClick={() => void logCall(company.id, contact?.id)}>Log call</Button>
                  <Link href={`/companies/${company.id}`} className="text-sm underline">
                    Open
                  </Link>
                </div>
              </article>
            ))}
            {board.calls.length === 0 ? (
              <p className="text-sm text-ink-muted">No working accounts in the call queue.</p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="font-serif text-2xl">Drafts to approve</h2>
            <ul className="mt-3 space-y-2">
              {board.pendingDrafts.map((draft) => (
                <li key={draft.id} className="text-sm">
                  <Link href="/campaigns" className="underline">
                    {draft.company_name}
                  </Link>
                  <span className="text-ink-muted"> · first-touch</span>
                </li>
              ))}
              {board.pendingDrafts.length === 0 ? (
                <li className="text-sm text-ink-muted">Inbox is clear.</li>
              ) : null}
            </ul>
          </Card>
          <Card>
            <h2 className="font-serif text-2xl">Ready to copy</h2>
            <p className="mt-1 text-xs text-ink-muted">Copy into your own mail client. This app does not send.</p>
            <ul className="mt-3 space-y-2">
              {board.readyToCopy.map((draft) => (
                <li key={draft.id} className="text-sm">
                  <Link href="/campaigns" className="underline">
                    {draft.company_name}
                  </Link>
                  <span className="text-ink-muted"> · {draft.status}</span>
                </li>
              ))}
              {board.readyToCopy.length === 0 ? (
                <li className="text-sm text-ink-muted">Nothing approved yet.</li>
              ) : null}
            </ul>
          </Card>
          <Card>
            <h2 className="font-serif text-2xl">Replied — CRM open</h2>
            <ul className="mt-3 space-y-2">
              {board.replied.map((company) => (
                <li key={company.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/companies/${company.id}`} className="underline">
                    {company.name}
                  </Link>
                  <Pill tone={stageTone(company.stage)}>{stageLabel(company.stage)}</Pill>
                </li>
              ))}
              {board.replied.length === 0 ? (
                <li className="text-sm text-ink-muted">No replies yet. Keep CRM locked.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
