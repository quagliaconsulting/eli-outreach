import type { ReactNode } from "react";

export function ExampleStamp({ className = "" }: { className?: string }) {
  return <span className={`stamp pointer-events-none ${className}`}>Example data</span>;
}

export function Pill({
  children,
  tone = "ink",
  title,
}: {
  children: ReactNode;
  tone?: "ink" | "forest" | "gold" | "stamp" | "muted";
  title?: string;
}) {
  const tones = {
    ink: "bg-navy text-paper",
    forest: "bg-forest text-white",
    gold: "bg-gold-soft text-ink",
    stamp: "bg-stamp-soft text-stamp",
    muted: "bg-paper-rule/60 text-ink-muted",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmailOnFile({ email }: { email: string | null | undefined }) {
  if (!email) {
    return (
      <span className="text-stamp">
        No email on file — do not invent.
      </span>
    );
  }
  return <span className="font-mono text-[13px]">{email}</span>;
}

export function Button({
  children,
  onClick,
  disabled,
  tone = "navy",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "navy" | "forest" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const tones = {
    navy: "bg-navy text-paper hover:bg-navy-mid",
    forest: "bg-forest text-white hover:bg-forest-dark",
    ghost: "bg-transparent text-ink border border-paper-rule hover:bg-white",
    danger: "bg-stamp text-white hover:bg-stamp/90",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function inputClassName(extra = "") {
  return `w-full rounded-md border border-paper-rule bg-white px-3 py-2 text-sm text-ink outline-none ring-gold/40 focus:ring-2 ${extra}`;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ticket rounded-xl border border-paper-rule p-4 shadow-ticket ${className}`}>
      {children}
    </section>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-stamp/30 bg-stamp-soft px-3 py-2 text-sm text-stamp">
      {message}
    </p>
  );
}

export function stageTone(stage: string): "ink" | "forest" | "gold" | "stamp" | "muted" {
  if (stage === "working") return "forest";
  if (stage === "next_up") return "gold";
  if (stage === "replied") return "ink";
  if (stage === "dnc") return "stamp";
  return "muted";
}

export function stageLabel(stage: string): string {
  if (stage === "next_up") return "Next up";
  if (stage === "backfill") return "Backfill";
  return stage.replace("_", " ");
}
