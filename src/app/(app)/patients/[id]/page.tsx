import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, noteTemplates, patients, payments, sessionNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_TYPES,
  PATIENT_STATUSES,
  PAYMENT_METHODS,
  label,
} from "@/lib/labels";
import { getPatientBalance } from "@/lib/queries";
import { Badge, Button, Card, EmptyState, Field, LinkButton, PageHeader, inputClass } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
import { createPayment } from "../../payments/actions";
import { createSessionNote, deleteSessionNote, updatePatient } from "../actions";

const TABS = [
  { key: "details", label: "פרטים אישיים" },
  { key: "appointments", label: "פגישות" },
  { key: "notes", label: "סיכומי טיפול" },
  { key: "payments", label: "תשלומים" },
] as const;

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; template?: string; saved?: string; receipt?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { tab = "details", template, saved, receipt, error } = await searchParams;
  const patientId = Number(id);

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, user.id)),
  });
  if (!patient) notFound();

  const balance = await getPatientBalance(user.id, patientId);

  return (
    <div>
      <PageHeader
        title={`${patient.firstName} ${patient.lastName}`}
        action={
          <LinkButton href={`/calendar/new?patientId=${patient.id}`}>+ קביעת פגישה</LinkButton>
        }
      />
      <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
        <Badge
          className={
            patient.status === "active"
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : "bg-gray-100 text-gray-500 border-gray-300"
          }
        >
          {label(PATIENT_STATUSES, patient.status)}
        </Badge>
        {patient.phone && <span dir="ltr" className="text-gray-600">{patient.phone}</span>}
        <span className={balance.balance > 0 ? "text-red-600 font-medium" : "text-emerald-700"}>
          יתרה לתשלום: {formatMoney(balance.balance)}
        </span>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
          הפרטים נשמרו בהצלחה
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          אירעה שגיאה – בדקו את הנתונים ונסו שוב
        </div>
      )}
      {receipt && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
          התשלום נקלט.{" "}
          <Link href={`/payments/${receipt}/receipt`} className="font-medium underline">
            הצגת קבלה להדפסה
          </Link>
        </div>
      )}

      <div className="no-print flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/patients/${patient.id}?tab=${t.key}`}
            className={`px-4 py-2 text-sm rounded-t-lg border border-b-0 ${
              tab === t.key
                ? "bg-white border-gray-200 font-medium text-primary-dark"
                : "bg-transparent border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "details" && (
        <Card className="p-6">
          <PatientForm
            action={updatePatient.bind(null, patient.id)}
            patient={patient}
            submitLabel="שמירת שינויים"
          />
        </Card>
      )}

      {tab === "appointments" && <AppointmentsTab userId={user.id} patientId={patient.id} />}
      {tab === "notes" && (
        <NotesTab userId={user.id} patientId={patient.id} templateId={template} />
      )}
      {tab === "payments" && (
        <PaymentsTab userId={user.id} patientId={patient.id} balance={balance} />
      )}
    </div>
  );
}

async function AppointmentsTab({ userId, patientId }: { userId: number; patientId: number }) {
  const rows = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userId), eq(appointments.patientId, patientId)))
    .orderBy(desc(appointments.date), desc(appointments.startTime));

  return (
    <Card>
      {rows.length === 0 ? (
        <EmptyState message="אין פגישות עדיין" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3 font-medium">תאריך</th>
              <th className="px-4 py-3 font-medium">שעה</th>
              <th className="px-4 py-3 font-medium">סוג</th>
              <th className="px-4 py-3 font-medium">מחיר</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/calendar/${a.id}`} className="text-primary-dark hover:underline">
                    {formatDate(a.date)}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.startTime}</td>
                <td className="px-4 py-3">{label(APPOINTMENT_TYPES, a.type)}</td>
                <td className="px-4 py-3">{formatMoney(a.price)}</td>
                <td className="px-4 py-3">
                  <Badge className={APPOINTMENT_STATUS_COLORS[a.status]}>
                    {label(APPOINTMENT_STATUSES, a.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

async function NotesTab({
  userId,
  patientId,
  templateId,
}: {
  userId: number;
  patientId: number;
  templateId?: string;
}) {
  const [notes, templates] = await Promise.all([
    db
      .select()
      .from(sessionNotes)
      .where(and(eq(sessionNotes.userId, userId), eq(sessionNotes.patientId, patientId)))
      .orderBy(desc(sessionNotes.date), desc(sessionNotes.id)),
    db.select().from(noteTemplates).where(eq(noteTemplates.userId, userId)),
  ]);

  const selectedTemplate = templates.find((t) => String(t.id) === templateId);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-bold mb-4">סיכום חדש</h2>
        {templates.length > 0 && (
          <div className="mb-4 text-sm">
            <span className="text-gray-500 ml-2">התחלה מתבנית:</span>
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/patients/${patientId}?tab=notes&template=${t.id}`}
                className={`inline-block ml-2 mb-1 rounded-full border px-3 py-1 text-xs ${
                  selectedTemplate?.id === t.id
                    ? "bg-primary-light border-primary text-primary-dark font-medium"
                    : "border-gray-300 text-gray-600 hover:border-primary"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
        <form action={createSessionNote} className="space-y-4">
          <input type="hidden" name="patientId" value={patientId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="כותרת">
              <input
                name="title"
                defaultValue={selectedTemplate ? selectedTemplate.name : "סיכום פגישה"}
                className={inputClass}
              />
            </Field>
            <Field label="תאריך">
              <input name="date" type="date" defaultValue={todayISO()} className={inputClass} />
            </Field>
          </div>
          <Field label="תוכן הסיכום *">
            <textarea
              name="body"
              rows={8}
              required
              key={selectedTemplate?.id ?? "blank"}
              defaultValue={selectedTemplate?.body ?? ""}
              className={inputClass}
            />
          </Field>
          <Button>שמירת סיכום</Button>
        </form>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <EmptyState message="אין סיכומי טיפול עדיין" />
        </Card>
      ) : (
        notes.map((n) => (
          <Card key={n.id} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">
                {n.title}
                <span className="text-gray-400 font-normal text-sm mr-3">{formatDate(n.date)}</span>
              </div>
              <form action={deleteSessionNote.bind(null, n.id, patientId)}>
                <button className="text-xs text-red-500 hover:underline">מחיקה</button>
              </form>
            </div>
            <div className="text-sm whitespace-pre-wrap text-gray-700">{n.body}</div>
          </Card>
        ))
      )}
    </div>
  );
}

async function PaymentsTab({
  userId,
  patientId,
  balance,
}: {
  userId: number;
  patientId: number;
  balance: { charged: number; paid: number; balance: number };
}) {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.patientId, patientId)))
    .orderBy(desc(payments.date), desc(payments.id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-sm text-gray-500">סה״כ חיובים (פגישות שהתקיימו)</div>
          <div className="text-2xl font-bold mt-1">{formatMoney(balance.charged)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">סה״כ שולם</div>
          <div className="text-2xl font-bold mt-1 text-emerald-700">{formatMoney(balance.paid)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">יתרה לתשלום</div>
          <div className={`text-2xl font-bold mt-1 ${balance.balance > 0 ? "text-red-600" : ""}`}>
            {formatMoney(balance.balance)}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-bold mb-4">קליטת תשלום</h2>
        <form action={createPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <input type="hidden" name="patientId" value={patientId} />
          <Field label="סכום (₪) *">
            <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
          </Field>
          <Field label="אמצעי תשלום">
            <select name="method" className={inputClass}>
              {Object.entries(PAYMENT_METHODS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </Field>
          <Field label="תאריך">
            <input name="date" type="date" defaultValue={todayISO()} className={inputClass} />
          </Field>
          <div>
            <Button>קליטת תשלום</Button>
          </div>
          <Field label="הערה" className="md:col-span-4">
            <input name="note" className={inputClass} />
          </Field>
        </form>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="אין תשלומים עדיין" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">קבלה</th>
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3 font-medium">סכום</th>
                <th className="px-4 py-3 font-medium">אמצעי</th>
                <th className="px-4 py-3 font-medium">הערה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/payments/${p.id}/receipt`} className="text-primary-dark hover:underline">
                      #{p.receiptNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-3">{label(PAYMENT_METHODS, p.method)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
