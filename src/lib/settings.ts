import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, type Settings } from "@/db/schema";

export const DEFAULT_SETTINGS: Omit<Settings, "userId"> = {
  whatsappEnabled: 0,
  whatsappNumber: null,
  workStart: "09:00",
  workEnd: "17:00",
  slotMinutes: 60,
  defaultPrice: 350,
  reminderEnabled: 0,
  reminderHoursBefore: 24,
  reminderTemplate: null,
};

export async function getSettings(userId: number): Promise<Settings> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.userId, userId),
  });
  return row ?? { userId, ...DEFAULT_SETTINGS };
}

export async function saveSettings(
  userId: number,
  values: Partial<Omit<Settings, "userId">>
): Promise<void> {
  await db
    .insert(settings)
    .values({ userId, ...DEFAULT_SETTINGS, ...values })
    .onConflictDoUpdate({ target: settings.userId, set: values });
}
