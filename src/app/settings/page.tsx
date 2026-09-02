"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorNote, Field, inputClassName } from "@/components/ui";
import { api } from "@/lib/client";
import { FROM_EMAIL, OPS_RULES, PACKET_URL, REPLY_TO_EMAIL, TIMEZONE } from "@/lib/constants";
import { LOCKED_FIRST_TOUCH_BODY, LOCKED_FIRST_TOUCH_SUBJECT } from "@/lib/constants";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fleet, setFleet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Settings>("/api/settings")
      .then((data) => {
        setSettings(data);
        setName(data.sender_name);
        setPhone(data.sender_phone);
        setFleet(data.fleet_counts_enabled === 1);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load settings"));
  }, []);

  async function save() {
    try {
      const next = await api<Settings>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          sender_name: name,
          sender_phone: phone,
          fleet_counts_enabled: fleet,
        }),
      });
      setSettings(next);
      setFleet(next.fleet_counts_enabled === 1);
      setSaved(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!settings) return <p className="text-ink-muted">Loading settings…</p>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Settings</p>
        <h1 className="font-serif text-4xl">Sender and guardrails</h1>
      </header>
      <ErrorNote message={error} />

      <Card>
        <h2 className="font-serif text-2xl">Identity</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Sender name">
            <input className={inputClassName()} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Sender phone">
            <input className={inputClassName()} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="From (locked)">
            <input className={inputClassName("bg-paper")} value={FROM_EMAIL} readOnly />
          </Field>
          <Field label="Reply-To (locked)">
            <input className={inputClassName("bg-paper")} value={REPLY_TO_EMAIL} readOnly />
          </Field>
          <Field label="Timezone (locked)">
            <input className={inputClassName("bg-paper")} value={TIMEZONE} readOnly />
          </Field>
          <Field label="Packet URL (locked)">
            <input className={inputClassName("bg-paper")} value={PACKET_URL} readOnly />
          </Field>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-md border border-paper-rule bg-white/70 px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={fleet}
            onChange={(event) => setFleet(event.target.checked)}
          />
          <span>
            <strong>Fleet counts in first-touch</strong>
            <span className="mt-1 block text-ink-muted">
              Default is OFF. Leave unchecked unless you intentionally want truck/trailer headcount in copy.
            </span>
          </span>
        </label>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => void save()}>Save settings</Button>
          {saved ? <span className="text-sm text-forest">Saved. From / Reply-To / timezone remain locked.</span> : null}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-2xl">Locked first-touch</h2>
        <p className="mt-2 font-medium">{LOCKED_FIRST_TOUCH_SUBJECT}</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-navy px-4 py-3 font-mono text-[12px] text-paper">
          {LOCKED_FIRST_TOUCH_BODY}
        </pre>
      </Card>

      <Card>
        <h2 className="font-serif text-2xl">Operating rules</h2>
        <div className="mt-3">
          {OPS_RULES.map((rule) => (
            <div key={rule.id} className="rule-row py-3">
              <p className="text-sm font-semibold">{rule.title}</p>
              <p className="text-sm text-ink-muted">{rule.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
