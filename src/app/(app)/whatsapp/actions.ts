"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { handleIncomingWhatsApp } from "@/lib/whatsapp/engine";
import { runRemindersForUser } from "@/lib/whatsapp/reminders";

export async function saveWhatsappSettings(formData: FormData) {
  const user = await requireUser();
  await saveSettings(user.id, {
    whatsappEnabled: formData.get("whatsappEnabled") ? 1 : 0,
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim() || null,
    workStart: String(formData.get("workStart") ?? "09:00"),
    workEnd: String(formData.get("workEnd") ?? "17:00"),
    slotMinutes: Math.max(15, Number(formData.get("slotMinutes")) || 60),
    defaultPrice: Math.max(0, Number(formData.get("defaultPrice")) || 350),
  });
  revalidatePath("/whatsapp");
  redirect("/whatsapp?saved=1");
}

export async function saveReminderSettings(formData: FormData) {
  const user = await requireUser();
  await saveSettings(user.id, {
    reminderEnabled: formData.get("reminderEnabled") ? 1 : 0,
    reminderHoursBefore: Math.max(1, Number(formData.get("reminderHoursBefore")) || 24),
    reminderTemplate: String(formData.get("reminderTemplate") ?? "").trim() || null,
  });
  revalidatePath("/whatsapp");
  redirect("/whatsapp?saved=1");
}

export async function sendRemindersNow() {
  const user = await requireUser();
  const result = await runRemindersForUser(user.id);
  revalidatePath("/whatsapp");
  const delivered = result.sent + result.simulated;
  redirect(`/whatsapp?reminded=${delivered}&failed=${result.failed + result.skippedNoPhone}`);
}

export async function simulateIncoming(
  phone: string,
  text: string
): Promise<string> {
  const user = await requireUser();
  if (!phone.trim() || !text.trim()) return "יש להזין טלפון והודעה";
  return handleIncomingWhatsApp(user.id, phone, text);
}
