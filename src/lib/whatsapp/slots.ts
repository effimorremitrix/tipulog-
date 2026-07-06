import { and, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, type Settings } from "@/db/schema";
import { addDays, todayISO } from "@/lib/format";

export type Slot = { date: string; time: string };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Israel working week: Sunday–Thursday. */
function isWorkDay(isoDate: string): boolean {
  const dow = new Date(`${isoDate}T12:00:00`).getDay();
  return dow >= 0 && dow <= 4;
}

function nowHHMMInIsrael(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Next free appointment slots inside working hours, skipping conflicts. */
export async function findFreeSlots(
  userId: number,
  config: Settings,
  maxSlots = 8,
  daysAhead = 14
): Promise<Slot[]> {
  const today = todayISO();
  const busy = await db
    .select({
      date: appointments.date,
      startTime: appointments.startTime,
      durationMin: appointments.durationMin,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        gte(appointments.date, today),
        ne(appointments.status, "cancelled")
      )
    );

  const busyByDate = new Map<string, { start: number; end: number }[]>();
  for (const b of busy) {
    const list = busyByDate.get(b.date) ?? [];
    const start = toMinutes(b.startTime);
    list.push({ start, end: start + b.durationMin });
    busyByDate.set(b.date, list);
  }

  const startMin = toMinutes(config.workStart);
  const endMin = toMinutes(config.workEnd);
  const step = Math.max(15, config.slotMinutes);
  const slots: Slot[] = [];

  for (let d = 0; d < daysAhead && slots.length < maxSlots; d++) {
    const date = addDays(today, d);
    if (!isWorkDay(date)) continue;
    const dayBusy = busyByDate.get(date) ?? [];
    for (let t = startMin; t + step <= endMin && slots.length < maxSlots; t += step) {
      if (d === 0 && toHHMM(t) <= nowHHMMInIsrael()) continue;
      const overlaps = dayBusy.some((b) => t < b.end && t + step > b.start);
      if (!overlaps) slots.push({ date, time: toHHMM(t) });
    }
  }
  return slots;
}
