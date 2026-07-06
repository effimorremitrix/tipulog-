import { asc, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { WhatsappSimulator } from "@/components/whatsapp-simulator";
import { saveWhatsappSettings } from "./actions";

export default async function WhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { saved } = await searchParams;
  const config = await getSettings(user.id);

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
    </div>
  );
}
