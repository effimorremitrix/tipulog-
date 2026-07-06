import { asc, and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, reminders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { DEFAULT_REMINDER_TEMPLATE } from "@/lib/whatsapp/reminders";
import { Badge, Button, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { WhatsappSimulator } from "@/components/whatsapp-simulator";
import { saveReminderSettings, saveWhatsappSettings, sendRemindersNow } from "./actions";

const REMINDER_STATUS = {
  sent: { label: "נשלחה", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  simulated: { label: "סימולציה", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  failed: { label: "נכשלה", cls: "bg-red-100 text-red-700 border-red-300" },
} as const;

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reminded?: string; failed?: string }>;
}) {
  const user = await requireUser();
  const { saved, reminded, failed } = await searchParams;
  const config = await getSettings(user.id);

  const recentReminders = await db
    .select({
      id: reminders.id,
      status: reminders.status,
      message: reminders.message,
      sentAt: reminders.sentAt,
      phone: reminders.phone,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(reminders)
    .innerJoin(patients, eq(reminders.patientId, patients.id))
    .where(eq(reminders.userId, user.id))
    .orderBy(desc(reminders.id))
    .limit(10);

  const [firstPatient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.userId, user.id), eq(patients.status, "active")))
    .orderBy(asc(patients.id))
    .limit(1);

  return (
    <div>
      <PageHeader title="וואטסאפ – קביעת תורים אוטומטית" />
      <p className="text-sm text-gray-500 -mt-4 mb-6">
        מטופלים שולחים הודעת וואטסאפ למספר הקליניקה ויכולים לקבוע, לראות ולבטל תורים לבד –
        לפי שעות הפעילות והתורים הפנויים ביומן.
      </p>
      {saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
          ההגדרות נשמרו בהצלחה
        </div>
      )}
      {reminded !== undefined && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
          נשלחו {reminded} תזכורות{Number(failed) > 0 ? `, ${failed} נכשלו או דולגו` : ""}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-bold mb-4">הגדרות</h2>
            <form action={saveWhatsappSettings} className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="whatsappEnabled"
                  defaultChecked={config.whatsappEnabled === 1}
                  className="size-4 accent-teal-600"
                />
                הפעלת קביעת תורים בוואטסאפ
              </label>
              <Field label="מספר הוואטסאפ של הקליניקה">
                <input
                  name="whatsappNumber"
                  defaultValue={config.whatsappNumber ?? ""}
                  placeholder="+972501234567"
                  dir="ltr"
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="תחילת יום עבודה">
                  <input name="workStart" type="time" defaultValue={config.workStart} className={inputClass} />
                </Field>
                <Field label="סיום יום עבודה">
                  <input name="workEnd" type="time" defaultValue={config.workEnd} className={inputClass} />
                </Field>
                <Field label="אורך תור (דקות)">
                  <input name="slotMinutes" type="number" min={15} step={5} defaultValue={config.slotMinutes} className={inputClass} />
                </Field>
                <Field label="מחיר ברירת מחדל (₪)">
                  <input name="defaultPrice" type="number" min={0} defaultValue={config.defaultPrice} className={inputClass} />
                </Field>
              </div>
              <Button>שמירת הגדרות</Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold">תזכורות אוטומטיות לפני תור</h2>
              <form action={sendRemindersNow}>
                <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs hover:bg-gray-50">
                  ⏰ שליחת תזכורות עכשיו
                </button>
              </form>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              המערכת שולחת לכל מטופל תזכורת וואטסאפ לפני התור, פעם אחת בלבד לכל פגישה.
              כשהשרת פעיל התזכורות נשלחות אוטומטית כל כמה דקות.
            </p>
            <form action={saveReminderSettings} className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="reminderEnabled"
                  defaultChecked={config.reminderEnabled === 1}
                  className="size-4 accent-teal-600"
                />
                הפעלת תזכורות אוטומטיות
              </label>
              <Field label="כמה שעות לפני התור לשלוח?">
                <input
                  name="reminderHoursBefore"
                  type="number"
                  min={1}
                  max={168}
                  defaultValue={config.reminderHoursBefore}
                  className={inputClass}
                />
              </Field>
              <Field label="נוסח ההודעה (משתנים: {שם} {קליניקה} {יום} {תאריך} {שעה})">
                <textarea
                  name="reminderTemplate"
                  rows={3}
                  defaultValue={config.reminderTemplate ?? ""}
                  placeholder={DEFAULT_REMINDER_TEMPLATE}
                  className={inputClass}
                />
              </Field>
              <Button>שמירת הגדרות תזכורות</Button>
            </form>
          </Card>

          <Card className="p-6 text-sm space-y-3">
            <h2 className="font-bold">חיבור לוואטסאפ אמיתי (Twilio)</h2>
            <p className="text-gray-600">
              לקבלת הודעות אמיתיות חברו מספר WhatsApp Business דרך Twilio והגדירו את כתובת ה-Webhook:
            </p>
            <code className="block bg-gray-100 rounded-lg px-3 py-2" dir="ltr">
              POST https://your-domain/api/whatsapp/webhook
            </code>
            <p className="text-gray-600">
              ימי העבודה הם ראשון–חמישי. תורים מוצעים רק בשעות הפעילות ובזמנים פנויים ביומן.
              פגישות שנקבעו בוואטסאפ מסומנות ביומן במקור "וואטסאפ".
              אבטחה: הגדירו <code dir="ltr">TWILIO_AUTH_TOKEN</code> לאימות חתימת הבקשות.
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-bold mb-4">סימולטור – נסו את הבוט</h2>
          <WhatsappSimulator defaultPhone={firstPatient?.phone ?? "050-1234567"} />
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="font-bold mb-3">תזכורות אחרונות</h2>
        <Card>
          {recentReminders.length === 0 ? (
            <EmptyState message="טרם נשלחו תזכורות" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-3 font-medium">נשלחה</th>
                  <th className="px-4 py-3 font-medium">מטופל/ת</th>
                  <th className="px-4 py-3 font-medium">סטטוס</th>
                  <th className="px-4 py-3 font-medium">הודעה</th>
                </tr>
              </thead>
              <tbody>
                {recentReminders.map((r) => {
                  const st =
                    REMINDER_STATUS[r.status as keyof typeof REMINDER_STATUS] ??
                    REMINDER_STATUS.failed;
                  return (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
                        {r.sentAt.slice(0, 16)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.firstName} {r.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={st.cls}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.message}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
