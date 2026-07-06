import { and, asc, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, users, whatsappSessions, type Patient } from "@/db/schema";
import { dayName, formatDate, todayISO } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { findFreeSlots, type Slot } from "./slots";

type WaState = {
  step: "menu" | "choosing_slot" | "cancelling";
  slots?: Slot[];
  apptIds?: number[];
};

/** "whatsapp:+972501234567" / "050-1234567" -> "0501234567" */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}

async function findPatientByPhone(
  userId: number,
  phone: string
): Promise<Patient | null> {
  const rows = await db
    .select()
    .from(patients)
    .where(and(eq(patients.userId, userId), eq(patients.status, "active")));
  return rows.find((p) => p.phone && normalizePhone(p.phone) === phone) ?? null;
}

async function loadState(userId: number, phone: string): Promise<WaState> {
  const row = await db.query.whatsappSessions.findFirst({
    where: and(
      eq(whatsappSessions.userId, userId),
      eq(whatsappSessions.phone, phone)
    ),
  });
  if (!row) return { step: "menu" };
  try {
    const parsed = JSON.parse(row.state) as WaState;
    return parsed.step ? parsed : { step: "menu" };
  } catch {
    return { step: "menu" };
  }
}

async function saveState(userId: number, phone: string, state: WaState) {
  const existing = await db.query.whatsappSessions.findFirst({
    where: and(
      eq(whatsappSessions.userId, userId),
      eq(whatsappSessions.phone, phone)
    ),
  });
  const json = JSON.stringify(state);
  if (existing) {
    await db
      .update(whatsappSessions)
      .set({ state: json, updatedAt: new Date().toISOString() })
      .where(eq(whatsappSessions.id, existing.id));
  } else {
    await db.insert(whatsappSessions).values({ userId, phone, state: json });
  }
}

const MENU =
  "במה אפשר לעזור?\n" +
  "1 - קביעת תור חדש\n" +
  "2 - התורים הקרובים שלי\n" +
  "3 - ביטול תור\n\n" +
  'בכל שלב אפשר לכתוב "תפריט" כדי לחזור לכאן.';

function slotLine(i: number, s: Slot): string {
  return `${i + 1}. יום ${dayName(s.date)} ${formatDate(s.date)} בשעה ${s.time}`;
}

async function upcomingAppointments(userId: number, patientId: number) {
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.patientId, patientId),
        gte(appointments.date, todayISO()),
        ne(appointments.status, "cancelled")
      )
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime));
}

/**
 * WhatsApp booking assistant. Receives one incoming message and returns the
 * reply text. Used by both the Twilio webhook and the built-in simulator.
 */
export async function handleIncomingWhatsApp(
  userId: number,
  rawPhone: string,
  rawText: string
): Promise<string> {
  const phone = normalizePhone(rawPhone);
  const text = rawText.trim();
  const config = await getSettings(userId);
  const clinic = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  const clinicName = clinic?.clinicName || clinic?.name || "הקליניקה";

  if (!config.whatsappEnabled) {
    return `שלום! קביעת תורים בוואטסאפ אינה פעילה כרגע. ליצירת קשר עם ${clinicName} אנא התקשרו.`;
  }

  const patient = await findPatientByPhone(userId, phone);
  if (!patient) {
    return (
      `שלום! מספר הטלפון שלכם אינו מוכר במערכת של ${clinicName}.\n` +
      "אם אתם מטופלים בקליניקה, אנא פנו למטפל/ת כדי לעדכן את מספר הטלפון בתיק."
    );
  }

  const state = await loadState(userId, phone);
  const reset = async (reply: string) => {
    await saveState(userId, phone, { step: "menu" });
    return reply;
  };

  if (/^(תפריט|menu|היי|שלום|הי)$/i.test(text)) {
    return reset(`שלום ${patient.firstName}! כאן העוזר הדיגיטלי של ${clinicName} 🤖\n\n${MENU}`);
  }

  if (state.step === "choosing_slot" && state.slots?.length) {
    const choice = Number(text);
    if (Number.isInteger(choice) && choice >= 1 && choice <= state.slots.length) {
      const slot = state.slots[choice - 1];
      // Re-check availability at booking time.
      const fresh = await findFreeSlots(userId, config, 100);
      const stillFree = fresh.some((s) => s.date === slot.date && s.time === slot.time);
      if (!stillFree) {
        return reset("מצטערים, התור הזה נתפס בינתיים. כתבו 1 כדי לראות זמנים עדכניים.");
      }
      await db.insert(appointments).values({
        userId,
        patientId: patient.id,
        date: slot.date,
        startTime: slot.time,
        durationMin: config.slotMinutes,
        type: "session",
        status: "scheduled",
        price: config.defaultPrice,
        source: "whatsapp",
        note: "נקבע באמצעות וואטסאפ",
      });
      return reset(
        `✅ התור נקבע!\nיום ${dayName(slot.date)} ${formatDate(slot.date)} בשעה ${slot.time}.\n\nנתראה! לחזרה לתפריט כתבו "תפריט".`
      );
    }
    return `לא הבנתי. אנא השיבו במספר בין 1 ל-${state.slots.length}, או כתבו "תפריט".`;
  }

  if (state.step === "cancelling" && state.apptIds?.length) {
    const choice = Number(text);
    if (Number.isInteger(choice) && choice >= 1 && choice <= state.apptIds.length) {
      const apptId = state.apptIds[choice - 1];
      await db
        .update(appointments)
        .set({ status: "cancelled" })
        .where(and(eq(appointments.id, apptId), eq(appointments.userId, userId)));
      return reset('התור בוטל. ✅\nלקביעת תור חדש כתבו 1, או "תפריט" לאפשרויות נוספות.');
    }
    return `לא הבנתי. אנא השיבו במספר בין 1 ל-${state.apptIds.length}, או כתבו "תפריט".`;
  }

  // Menu step
  if (text === "1") {
    const slots = await findFreeSlots(userId, config, 8);
    if (slots.length === 0) {
      return reset("לא נמצאו תורים פנויים בשבועיים הקרובים. אנא פנו ישירות למטפל/ת.");
    }
    await saveState(userId, phone, { step: "choosing_slot", slots });
    return (
      "אלו התורים הפנויים הקרובים:\n" +
      slots.map((s, i) => slotLine(i, s)).join("\n") +
      "\n\nהשיבו במספר התור הרצוי."
    );
  }

  if (text === "2") {
    const appts = await upcomingAppointments(userId, patient.id);
    if (appts.length === 0) {
      return reset('אין לכם תורים קרובים. לקביעת תור חדש כתבו 1.');
    }
    return reset(
      "התורים הקרובים שלכם:\n" +
        appts
          .map((a) => `• יום ${dayName(a.date)} ${formatDate(a.date)} בשעה ${a.startTime}`)
          .join("\n") +
        `\n\n${MENU}`
    );
  }

  if (text === "3") {
    const appts = await upcomingAppointments(userId, patient.id);
    if (appts.length === 0) {
      return reset("אין לכם תורים קרובים לביטול.");
    }
    await saveState(userId, phone, {
      step: "cancelling",
      apptIds: appts.map((a) => a.id),
    });
    return (
      "איזה תור לבטל?\n" +
      appts
        .map((a, i) => `${i + 1}. יום ${dayName(a.date)} ${formatDate(a.date)} בשעה ${a.startTime}`)
        .join("\n") +
      "\n\nהשיבו במספר התור לביטול."
    );
  }

  return reset(`שלום ${patient.firstName}! כאן העוזר הדיגיטלי של ${clinicName} 🤖\n\n${MENU}`);
}
