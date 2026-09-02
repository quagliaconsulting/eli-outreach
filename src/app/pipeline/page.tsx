"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, EmailOnFile, ErrorNote, ExampleStamp, Pill, stageLabel } from "@/components/ui";
import { api } from "@/lib/client";
import { PIPELINE_COLUMNS, type PipelineColumn } from "@/lib/constants";
import type { CompanyWithContacts } from "@/lib/types";

const LABELS: Record<PipelineColumn, string> = {
  working: "Working",
  next_up: "Next up",
  backfill: "Backfill",
};

export default function PipelinePage() {
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<{ companies: CompanyWithContacts[] }>("/api/companies");
      setCompanies(data.companies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function move(id: number, stage: PipelineColumn) {
    try {
      await api(`/api/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Pipeline</p>
        <h1 className="font-serif text-4xl">Working / Next up / Backfill</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Live outreach only. Replied accounts leave these columns and unlock CRM. DNC accounts cannot be moved back in.
        </p>
      </header>
      <ErrorNote message={error} />
      <div className="grid gap-4 xl:grid-cols-3">
        {PIPELINE_COLUMNS.map((column) => {
          const rows = companies.filter((company) => company.stage === column);
          return (
            <Card key={column}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-serif text-2xl">{LABELS[column]}</h2>
                <Pill tone={column === "working" ? "forest" : column === "next_up" ? "gold" : "muted"}>
                  {rows.length}
                </Pill>
              </div>
              <div className="space-y-3">
                {rows.map((company) => {
                  const contact = company.contacts.find((c) => c.is_primary) ?? company.contacts[0];
                  return (
                    <article key={company.id} className="relative rounded-lg border border-paper-rule bg-white/80 p-3">
                      {company.is_example ? <ExampleStamp className="absolute right-2 top-2" /> : null}
                      <Link href={`/companies/${company.id}`} className="font-serif text-lg hover:underline">
                        {company.name}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {company.industry} · {company.city}, {company.state}
                      </p>
                      <p className="mt-1 text-sm">
                        {contact ? `${contact.first_name} ${contact.last_name}` : "No contact"}
                      </p>
                      <p className="mt-1 font-mono text-xs">{contact?.phone || company.phone || "No phone"}</p>
                      <p className="mt-1 text-xs">
                        <EmailOnFile email={contact?.email} />
                      </p>
                      {company.dnc ? <p className="mt-2 text-xs text-stamp">DNC — first-touch blocked</p> : null}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {PIPELINE_COLUMNS.filter((item) => item !== column).map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="rounded border border-paper-rule px-2 py-1 text-[11px] hover:bg-paper"
                            onClick={() => void move(company.id, item)}
                          >
                            Move to {stageLabel(item)}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
                {rows.length === 0 ? <p className="text-sm text-ink-muted">Empty column.</p> : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
