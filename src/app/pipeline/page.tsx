"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
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
} from "@/components/ui";
import { api } from "@/lib/client";
import { PIPELINE_COLUMNS, type PipelineColumn } from "@/lib/constants";
import type { CompanyWithContacts } from "@/lib/types";

const LABELS: Record<PipelineColumn, string> = {
  working: "Working",
  next_up: "Next up",
  backfill: "Backfill",
};

const EMPTY_FORM = {
  name: "",
  industry: "",
  city: "",
  state: "",
  phone: "",
  website: "",
  notes: "",
  stage: "next_up" as PipelineColumn,
  first_name: "",
  last_name: "",
  title: "",
  contact_phone: "",
  email: "",
};

export default function PipelinePage() {
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);

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

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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

  async function addAccount(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const hasContact =
        form.first_name.trim() ||
        form.last_name.trim() ||
        form.title.trim() ||
        form.contact_phone.trim() ||
        form.email.trim();
      await api("/api/companies", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          industry: form.industry,
          city: form.city,
          state: form.state,
          phone: form.phone || null,
          website: form.website || null,
          notes: form.notes,
          stage: form.stage,
          contact: hasContact
            ? {
                first_name: form.first_name,
                last_name: form.last_name,
                title: form.title,
                phone: form.contact_phone || null,
                email: form.email.trim() || null,
              }
            : undefined,
        }),
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add account");
    } finally {
      setSaving(false);
    }
  }

  async function purgeExamples() {
    setPurging(true);
    try {
      await api("/api/examples/purge", { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete example data");
    } finally {
      setPurging(false);
    }
  }

  const hasExamples = companies.some((company) => company.is_example);

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

      <Card>
        <h2 className="font-serif text-2xl">Add account</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Creates a real shipper (is_example = 0). Leave email blank unless it is published.
        </p>
        <form className="mt-4 space-y-4" onSubmit={(event) => void addAccount(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Company name">
              <input
                className={inputClassName()}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                required
              />
            </Field>
            <Field label="Industry">
              <input
                className={inputClassName()}
                value={form.industry}
                onChange={(event) => setField("industry", event.target.value)}
              />
            </Field>
            <Field label="City">
              <input
                className={inputClassName()}
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
              />
            </Field>
            <Field label="State">
              <input
                className={inputClassName()}
                value={form.state}
                onChange={(event) => setField("state", event.target.value)}
              />
            </Field>
            <Field label="Switchboard">
              <input
                className={inputClassName()}
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                className={inputClassName()}
                value={form.website}
                onChange={(event) => setField("website", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              className={inputClassName("min-h-[72px]")}
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </Field>
          <Field label="Stage">
            <select
              className={inputClassName()}
              value={form.stage}
              onChange={(event) => setField("stage", event.target.value as PipelineColumn)}
            >
              {PIPELINE_COLUMNS.map((column) => (
                <option key={column} value={column}>
                  {LABELS[column]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Contact first name" hint="Use Shipping if there is no named person.">
              <input
                className={inputClassName()}
                value={form.first_name}
                onChange={(event) => setField("first_name", event.target.value)}
              />
            </Field>
            <Field label="Contact last name">
              <input
                className={inputClassName()}
                value={form.last_name}
                onChange={(event) => setField("last_name", event.target.value)}
              />
            </Field>
            <Field label="Title">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </Field>
            <Field label="Contact phone">
              <input
                className={inputClassName()}
                value={form.contact_phone}
                onChange={(event) => setField("contact_phone", event.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Email — only if published — leave blank otherwise"
            hint="Never invent an address. Phone first when nothing is on file."
          >
            <input
              className={inputClassName()}
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : "Add account"}
          </Button>
        </form>
      </Card>

      {hasExamples ? (
        <Card>
          <h2 className="font-serif text-2xl">Example data</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Fictional seed accounts are stamped EXAMPLE DATA. Purge deletes them permanently and does not touch real
            accounts.
          </p>
          <div className="mt-3">
            <Button tone="danger" disabled={purging} onClick={() => void purgeExamples()}>
              {purging ? "Deleting…" : "Delete example data"}
            </Button>
          </div>
        </Card>
      ) : null}

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
                        {contact ? `${contact.first_name} ${contact.last_name}`.trim() : "No contact"}
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
