import { and, eq, notInArray, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, reminders, users } from "@/db/schema";
import { dayName, formatDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { sendWhatsAppMessage } from "./send";

export const DEFAULT_REMINDER_TEMPLATE =
  "שלום {שם}, תזכורת מ{קליניקה}: יש לך תור ביום {יום} {תאריך} בשעה {שעה}. נשמח לראותך! לביטול או שינוי – השיבו להודעה זו.";

/** "YYYY-MM-DD HH:MM" for now / now+hours, in clinic (Israel) time. */
function wallClock(hoursFromNow: number): { date: string; time: string } {
  const at = new Date(Date.now() + hoursFromNow * 3600_000);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  return { date, time };
}

export function renderReminder(
  template: string,
  vars: { name: string; clinic: string; date: string; time: string }
): string {
  return template
    .replaceAll("{שם}", vars.name)
    .replaceAll("{קליניקה}", vars.clinic)
    .replaceAll("{יום}", dayName(vars.date))
    .replaceAll("{תאריך}", formatDate(vars.date))
    .replaceAll("{שעה}", vars.time);
}

export type ReminderRunResult = {
  checked: number;
  sent: number;
  simulated: number;
  failed: number;
  skippedNoPhone: number;
};

/**
 * Send WhatsApp reminders for one clinic's scheduled appointments that start
 * within the configured window. Each appointment is reminded at most once
 * (unique index on reminders.appointment_id).
 */
export async function runRemindersForUser(userId: number): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    checked: 0,
    sent: 0,
    simulated: 0,
    failed: 0,
    skippedNoPhone: 0,
  };

  const config = await getSettings(userId);
  if (!config.reminderEnabled) return result;

  const clinic = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const clinicName = clinic?.clinicName || clinic?.name || "הקליניקה";
  const template = config.reminderTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;

  const now = wallClock(0);
  const until = wallClock(Math.max(1, config.reminderHoursBefore));

  const alreadyReminded = (
    await db
      .select({ appointmentId: reminders.appointmentId })
      .from(reminders)
      .where(eq(reminders.userId, userId))
  ).map((r) => r.appointmentId);

  const candidates = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      patientId: patients.id,
      firstName: patients.firstName,
      phone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.status, "scheduled"),
        gte(appointments.date, now.date),
        lte(appointments.date, until.date),
        alreadyReminded.length > 0
          ? notInArray(appointments.id, alreadyReminded)
          : undefined
      )
    );

  for (const appt of candidates) {
    const startsAt = `${appt.date} ${appt.startTime}`;
    if (startsAt <= `${now.date} ${now.time}`) continue; // already started
    if (startsAt > `${until.date} ${until.time}`) continue; // outside window
    result.checked++;

    if (!appt.phone) {
      result.skippedNoPhone++;
      continue;
    }

    const message = renderReminder(template, {
      name: appt.firstName,
      clinic: clinicName,
      date: appt.date,
      time: appt.startTime,
    });
    const sendResult = await sendWhatsAppMessage(appt.phone, message);
    await db.insert(reminders).values({
      userId,
      appointmentId: appt.id,
      patientId: appt.patientId,
      phone: appt.phone,
      message,
      status: sendResult.status,
      detail: sendResult.detail,
    });
    if (sendResult.status === "sent") result.sent++;
    else if (sendResult.status === "simulated") result.simulated++;
    else result.failed++;
  }

  return result;
}

/** Run reminders for every clinic account. Used by the background scheduler. */
export async function runAllReminders(): Promise<void> {
  const allUsers = await db.select({ id: users.id }).from(users);
  for (const u of allUsers) {
    try {
      await runRemindersForUser(u.id);
    } catch (e) {
      console.error(`[reminders] failed for user ${u.id}:`, e);
    }
  }
}
