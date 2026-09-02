"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FROM_EMAIL, TIMEZONE } from "@/lib/constants";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/dnc", label: "DNC" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [clock, setClock] = useState("");

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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-navy text-paper">
          <div className="border-b border-white/10 px-5 py-5">
            <p className="font-serif text-[22px] leading-none">ELI Outreach</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-paper/60">
              Shipper BD console
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm ${
                    active ? "bg-white/10 text-white" : "text-paper/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-2 border-t border-white/10 px-5 py-4 text-[11px] leading-relaxed text-paper/55">
            <p>From / Reply-To</p>
            <p className="font-mono text-[10px] text-paper/80">{FROM_EMAIL}</p>
            <p>This console never sends email.</p>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-4 border-b border-paper-rule bg-paper-card/80 px-6 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
              Elberta Logistics International
            </p>
            <p className="font-mono text-xs text-ink-muted">{clock || TIMEZONE}</p>
          </header>
          <div className="border-b border-gold/40 bg-gold-soft px-6 py-2 text-[12px] text-ink">
            Phone first. Never invent emails. DNC blocks first-touch. CRM only after Replied. Approve / copy / mark sent — never send.
          </div>
          <main className="px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
