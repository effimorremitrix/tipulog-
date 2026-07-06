/**
 * Background scheduler: while the server is running, due WhatsApp reminders
 * are sent automatically every few minutes. An external cron hitting
 * POST /api/reminders/run works too (e.g. for serverless deployments).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalState = globalThis as unknown as { tipulogReminderTimer?: boolean };
  if (globalState.tipulogReminderTimer) return;
  globalState.tipulogReminderTimer = true;

  const { runAllReminders } = await import("@/lib/whatsapp/reminders");
  const INTERVAL_MS = 5 * 60 * 1000;
  setTimeout(() => runAllReminders().catch(console.error), 15_000);
  setInterval(() => runAllReminders().catch(console.error), INTERVAL_MS);
}
