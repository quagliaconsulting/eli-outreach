import { TIMEZONE } from "./constants";

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatEtDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatEtTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function todayEtKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDueOnOrBeforeToday(iso: string | null): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) <= todayEtKey();
}
