import { asc, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { AppointmentForm } from "@/components/appointment-form";
import { createAppointment } from "../actions";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; patientId?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { date, time, patientId, error } = await searchParams;

  const patientsList = await db
    .select()
    .from(patients)
    .where(and(eq(patients.userId, user.id), eq(patients.status, "active")))
    .orderBy(asc(patients.firstName), asc(patients.lastName));

  return (
    <div>
      <PageHeader title="פגישה חדשה" />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          אירעה שגיאה – בדקו את הנתונים ונסו שוב
        </div>
      )}
      <Card className="p-6 max-w-2xl">
        <AppointmentForm
          action={createAppointment}
          patientsList={patientsList}
          defaults={{
            date: date ?? todayISO(),
            time,
            patientId: patientId ? Number(patientId) : undefined,
          }}
          submitLabel="קביעת פגישה"
        />
      </Card>
    </div>
  );
}
