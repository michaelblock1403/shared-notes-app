import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

export function relativeTime(value: string): string {
  const date = new Date(value);
  return formatDistanceToNow(date, { addSuffix: true, locale: de });
}

export function smartDate(value: string): string {
  const date = new Date(value);
  if (isToday(date)) return `Heute, ${format(date, "HH:mm", { locale: de })}`;
  if (isYesterday(date)) return `Gestern, ${format(date, "HH:mm", { locale: de })}`;
  return format(date, "d. MMM yyyy, HH:mm", { locale: de });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}
