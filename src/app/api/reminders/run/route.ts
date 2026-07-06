import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { runAllReminders, runRemindersForUser } from "@/lib/whatsapp/reminders";

/**
 * Manual/cron trigger for WhatsApp reminders.
 * - Logged-in practitioner: runs for their own clinic.
 * - External cron: send header `x-cron-secret: $REMINDERS_CRON_SECRET` to run
 *   for all clinics without a session.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.REMINDERS_CRON_SECRET;
  if (cronSecret && request.headers.get("x-cron-secret") === cronSecret) {
    await runAllReminders();
    return NextResponse.json({ ok: true, scope: "all" });
  }

  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const result = await runRemindersForUser(user.id);
  return NextResponse.json({ ok: true, scope: "user", ...result });
}
