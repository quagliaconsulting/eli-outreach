"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorNote, ExampleStamp, Field, inputClassName } from "@/components/ui";
import { api } from "@/lib/client";
import type { CompanyWithContacts, DncEntry } from "@/lib/types";

type DncRow = DncEntry & { company?: string | null; contact?: string | null };

export default function DncPage() {
  const [entries, setEntries] = useState<DncRow[]>([]);
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  async function load() {
    try {
      const [dnc, companyData] = await Promise.all([
        api<{ entries: DncRow[] }>("/api/dnc"),
        api<{ companies: CompanyWithContacts[] }>("/api/companies"),
      ]);
      setEntries(dnc.entries);
      setCompanies(companyData.companies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DNC");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    try {
      await api("/api/dnc", {
        method: "POST",
        body: JSON.stringify({
          company_id: companyId === "" ? null : companyId,
          company_name: name || null,
          email: email || null,
          phone: phone || null,
          reason,
        }),
      });
      setReason("");
      setEmail("");
      setPhone("");
      setName("");
      setCompanyId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add DNC");
    }
  }

  async function remove(id: number) {
    try {
      await api(`/api/dnc/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove DNC");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Do not contact</p>
        <h1 className="font-serif text-4xl">DNC list</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Matching company, contact, email, or phone blocks first-touch generation and approval.
        </p>
      </header>
      <ErrorNote message={error} />

      <Card>
        <h2 className="font-serif text-2xl">Add suppression</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Existing company">
            <select
              className={inputClassName()}
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value ? Number(event.target.value) : "")}
            >
              <option value="">Unlinked / name only</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Company name (if unlinked)">
            <input className={inputClassName()} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email on file only" hint="Leave blank if unknown. Do not invent.">
            <input className={inputClassName()} value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClassName()} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Reason">
            <input className={inputClassName()} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Button tone="danger" onClick={() => void add()} disabled={!reason.trim()}>
            Add to DNC
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="relative">
            {entry.reason.includes("EXAMPLE DATA") ? (
              <ExampleStamp className="absolute right-4 top-4" />
            ) : null}
            <p className="font-serif text-xl">{entry.company || entry.company_name || "Unnamed"}</p>
            <p className="text-sm text-ink-muted">{entry.contact || "No linked contact"}</p>
            <p className="mt-2 text-sm">{entry.reason}</p>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              {[entry.email || "no email", entry.phone || "no phone"].join(" · ")}
            </p>
            <div className="mt-3">
              <Button tone="ghost" onClick={() => void remove(entry.id)}>
                Remove
              </Button>
            </div>
          </Card>
        ))}
        {entries.length === 0 ? <p className="text-sm text-ink-muted">DNC list is empty.</p> : null}
      </div>
    </div>
  );
}
