import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_COLORS, label } from "@/lib/labels";
import { Badge, Card, PageHeader } from "@/components/ui";
import { AppointmentForm } from "@/components/appointment-form";
import { deleteAppointment, setAppointmentStatus, updateAppointment } from "../actions";

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const appointmentId = Number(id);

  const appointment = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, appointmentId), eq(appointments.userId, user.id)),
  });
  if (!appointment) notFound();

  const [patient, patientsList] = await Promise.all([
    db.query.patients.findFirst({
      where: and(eq(patients.id, appointment.patientId), eq(patients.userId, user.id)),
    }),
    db
      .select()
      .from(patients)
      .where(eq(patients.userId, user.id))
      .orderBy(asc(patients.firstName), asc(patients.lastName)),
  ]);

  const backTo = `/calendar/${appointment.id}`;

  return (
    <div>
      <PageHeader
        title={`פגישה – ${patient?.firstName ?? ""} ${patient?.lastName ?? ""}, ${formatDate(appointment.date)} ${appointment.startTime}`}
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          אירעה שגיאה – בדקו את הנתונים ונסו שוב
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge className={APPOINTMENT_STATUS_COLORS[appointment.status]}>
          {label(APPOINTMENT_STATUSES, appointment.status)}
        </Badge>
        {appointment.source === "whatsapp" && (
          <Badge className="bg-green-100 text-green-800 border-green-300">💬 נקבע בוואטסאפ</Badge>
        )}
        {appointment.status === "scheduled" && (
          <>
            <form action={setAppointmentStatus.bind(null, appointment.id, "completed", backTo)}>
              <button className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs hover:bg-emerald-100">
                ✓ סימון כהתקיימה
              </button>
            </form>
            <form action={setAppointmentStatus.bind(null, appointment.id, "cancelled", backTo)}>
              <button className="rounded-lg border border-gray-300 bg-white text-gray-600 px-3 py-1.5 text-xs hover:bg-gray-50">
                ביטול פגישה
              </button>
            </form>
            <form action={setAppointmentStatus.bind(null, appointment.id, "noshow", backTo)}>
              <button className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-3 py-1.5 text-xs hover:bg-amber-100">
                לא הגיע/ה
              </button>
            </form>
          </>
        )}
        <Link
          href={`/patients/${appointment.patientId}?tab=notes`}
          className="rounded-lg border border-gray-300 bg-white text-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          כתיבת סיכום טיפול
        </Link>
        <Link
          href={`/patients/${appointment.patientId}?tab=payments`}
          className="rounded-lg border border-gray-300 bg-white text-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          קליטת תשלום
        </Link>
      </div>

      <Card className="p-6 max-w-2xl">
        <AppointmentForm
          action={updateAppointment.bind(null, appointment.id)}
          patientsList={patientsList}
          appointment={appointment}
          submitLabel="שמירת שינויים"
        />
        <form action={deleteAppointment.bind(null, appointment.id)} className="mt-6 border-t border-gray-100 pt-4">
          <button className="text-sm text-red-600 hover:underline">מחיקת הפגישה</button>
        </form>
      </Card>
    </div>
  );
}
