"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FROM_EMAIL, TIMEZONE } from "@/lib/constants";

export function AppShell({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState("");
  const [send, setSend] = useState(false);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TIMEZONE,
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date()),
      );
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void fetch("/api/health")
      .then((response) => response.json())
      .then((data: { send?: boolean }) => setSend(Boolean(data.send)))
      .catch(() => setSend(false));
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-white/10 bg-navy text-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-serif text-[22px] leading-none">ELI Outreach</p>
            <p className="mt-1 text-[11px] text-paper/60">
              {send
                ? `Approve sends first-touch · From / Reply-To ${FROM_EMAIL}`
                : `Copy-only workstation · From / Reply-To ${FROM_EMAIL} · send is off`}
            </p>
          </div>
          <p className="font-mono text-xs text-paper/70">{clock || TIMEZONE}</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
