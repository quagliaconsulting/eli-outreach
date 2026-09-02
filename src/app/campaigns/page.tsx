"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmailOnFile,
  ErrorNote,
  ExampleStamp,
  Field,
  Pill,
  inputClassName,
} from "@/components/ui";
import { api } from "@/lib/client";
import { FROM_EMAIL, REPLY_TO_EMAIL } from "@/lib/constants";
import type { CompanyWithContacts, DraftView } from "@/lib/types";

export default function CampaignsPage() {
  const [drafts, setDrafts] = useState<DraftView[]>([]);
  const [companies, setCompanies] = useState<CompanyWithContacts[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | "">("");
  const [contactId, setContactId] = useState<number | "">("");
  const [hook, setHook] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const selected = companies.find((c) => c.id === companyId);

  async function load() {
    try {
      const [draftData, companyData] = await Promise.all([
        api<{ drafts: DraftView[] }>("/api/drafts"),
        api<{ companies: CompanyWithContacts[] }>("/api/companies"),
      ]);
      setDrafts(draftData.drafts);
      setCompanies(companyData.companies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const inbox = useMemo(
    () => drafts.filter((d) => d.status === "draft" || d.status === "approved" || d.status === "copied"),
    [drafts],
  );
  const other = useMemo(
    () => drafts.filter((d) => d.status === "sent" || d.status === "blocked"),
    [drafts],
  );

  async function createDraft() {
    if (companyId === "" || contactId === "") return;
    try {
      await api("/api/drafts", {
        method: "POST",
        body: JSON.stringify({
          company_id: companyId,
          contact_id: contactId,
          hook_line: hook,
        }),
      });
      setHook("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    }
  }

  async function act(id: number, action: "approve" | "copy" | "mark-sent", draft?: DraftView) {
    try {
      if (action === "copy" && draft) {
        const text = `From: ${FROM_EMAIL}\nReply-To: ${REPLY_TO_EMAIL}\nTo: ${draft.contact_email || "(no email on file — do not invent)"}\nSubject: ${draft.subject}\n\n${draft.body}`;
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
      }
      await api(`/api/drafts/${id}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Campaigns</p>
        <h1 className="font-serif text-4xl">Drafts inbox</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">
          Locked first-touch template. Approve, copy, mark sent. There is no Send. From and Reply-To stay {FROM_EMAIL}.
        </p>
      </header>
      <ErrorNote message={error} />

      <Card>
        <h2 className="font-serif text-2xl">New first-touch</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Company">
            <select
              className={inputClassName()}
              value={companyId}
              onChange={(event) => {
                const next = event.target.value ? Number(event.target.value) : "";
                setCompanyId(next);
                const company = companies.find((item) => item.id === next);
                setContactId(company?.contacts[0]?.id ?? "");
              }}
            >
              <option value="">Select</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.dnc ? " (DNC)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact">
            <select
              className={inputClassName()}
              value={contactId}
              onChange={(event) => setContactId(event.target.value ? Number(event.target.value) : "")}
            >
              <option value="">Select</option>
              {(selected?.contacts ?? []).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field
            label="Hook line"
            hint="Why this shipper. No LTL lead. No site visit. No invented email. Fleet counts stay off unless Settings enables them."
          >
            <textarea
              className={inputClassName("min-h-[88px]")}
              value={hook}
              onChange={(event) => setHook(event.target.value)}
              placeholder="you move produce out of south Georgia and likely need dry van and reefer truckload coverage"
            />
          </Field>
        </div>
        {selected ? (
          <p className="mt-3 text-sm">
            <EmailOnFile email={selected.contacts.find((c) => c.id === contactId)?.email} />
          </p>
        ) : null}
        <div className="mt-4">
          <Button onClick={() => void createDraft()} disabled={companyId === "" || !hook.trim()}>
            Generate locked draft
          </Button>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Inbox</h2>
        {inbox.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            copied={copiedId === draft.id}
            onApprove={() => void act(draft.id, "approve")}
            onCopy={() => void act(draft.id, "copy", draft)}
            onMarkSent={() => void act(draft.id, "mark-sent")}
          />
        ))}
        {inbox.length === 0 ? <p className="text-sm text-ink-muted">No open drafts.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Sent / blocked</h2>
        {other.map((draft) => (
          <DraftCard key={draft.id} draft={draft} copied={false} />
        ))}
        {other.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : null}
      </section>
    </div>
  );
}

function DraftCard({
  draft,
  copied,
  onApprove,
  onCopy,
  onMarkSent,
}: {
  draft: DraftView;
  copied: boolean;
  onApprove?: () => void;
  onCopy?: () => void;
  onMarkSent?: () => void;
}) {
  return (
    <Card className="relative">
      {draft.is_example ? <ExampleStamp className="absolute right-4 top-4" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3 pr-24">
        <div>
          <Link href={`/companies/${draft.company_id}`} className="font-serif text-xl hover:underline">
            {draft.company_name}
          </Link>
          <p className="text-sm text-ink-muted">
            {draft.contact_first_name} {draft.contact_last_name} · {draft.kind.replace("_", "-")}
          </p>
        </div>
        <Pill tone={draft.status === "blocked" ? "stamp" : draft.status === "sent" ? "forest" : "gold"}>
          {draft.status}
        </Pill>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">From / Reply-To</dt>
          <dd className="font-mono">{FROM_EMAIL}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">To</dt>
          <dd>
            <EmailOnFile email={draft.contact_email} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">Subject</dt>
          <dd className="font-medium">{draft.subject}</dd>
        </div>
      </dl>
      <pre className="mt-3 whitespace-pre-wrap rounded-md bg-navy px-4 py-3 font-mono text-[12px] leading-relaxed text-paper">
        {draft.body}
      </pre>
      {draft.blocked_reason ? <p className="mt-3 text-sm text-stamp">{draft.blocked_reason}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {onApprove && draft.status === "draft" ? (
          <Button tone="forest" onClick={onApprove}>
            Approve
          </Button>
        ) : null}
        {onCopy && draft.status !== "blocked" ? (
          <Button tone="ghost" onClick={onCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        ) : null}
        {onMarkSent && (draft.status === "approved" || draft.status === "copied") ? (
          <Button onClick={onMarkSent}>Mark sent</Button>
        ) : null}
        <span className="self-center text-xs text-ink-faint">No send control exists.</span>
      </div>
    </Card>
  );
}
