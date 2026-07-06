import Link from "next/link";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, payments, sessionNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, formatMoney, todayISO, weekStart } from "@/lib/format";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_COLORS, label } from "@/lib/labels";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayISO();
  const wStart = weekStart(today);
  const wEnd = addDays(wStart, 6);
  const monthStart = today.slice(0, 8) + "01";

  const [
    todayAppts,
    [weekCount],
    [activePatients],
    [monthCollected],
    [totalCharged],
    [totalPaid],
    recentNotes,
  ] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        status: appointments.status,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(eq(appointments.userId, user.id), eq(appointments.date, today)))
      .orderBy(asc(appointments.startTime)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, user.id),
          gte(appointments.date, wStart),
          lte(appointments.date, wEnd)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(eq(patients.userId, user.id), eq(patients.status, "active"))),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(eq(payments.userId, user.id), gte(payments.date, monthStart))),
    db
      .select({ total: sql<number>`coalesce(sum(${appointments.price}), 0)` })
      .from(appointments)
      .where(and(eq(appointments.userId, user.id), eq(appointments.status, "completed"))),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.userId, user.id)),
    db
      .select({
        id: sessionNotes.id,
        title: sessionNotes.title,
        date: sessionNotes.date,
        patientId: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(sessionNotes)
      .innerJoin(patients, eq(sessionNotes.patientId, patients.id))
      .where(eq(sessionNotes.userId, user.id))
      .orderBy(desc(sessionNotes.date), desc(sessionNotes.id))
      .limit(5),
  ]);

  const openBalance = (totalCharged?.total ?? 0) - (totalPaid?.total ?? 0);

  return (
    <div>
      <PageHeader
        title={`שלום, ${user.name}`}
        action={<LinkButton href={`/calendar/new?date=${today}`}>+ פגישה חדשה</LinkButton>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="text-sm text-gray-500">פגישות היום</div>
          <div className="text-3xl font-bold mt-1">{todayAppts.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">פגישות השבוע</div>
          <div className="text-3xl font-bold mt-1">{weekCount?.count ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">מטופלים פעילים</div>
          <div className="text-3xl font-bold mt-1">{activePatients?.count ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-gray-500">גבייה החודש</div>
          <div className="text-3xl font-bold mt-1 text-emerald-700">
            {formatMoney(monthCollected?.total ?? 0)}
          </div>
          {openBalance > 0 && (
            <div className="text-xs text-red-600 mt-1">
              יתרות פתוחות: {formatMoney(openBalance)}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold mb-3">היום ביומן · {formatDate(today)}</h2>
          <Card>
            {todayAppts.length === 0 ? (
              <EmptyState message="אין פגישות היום" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {todayAppts.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/calendar/${a.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-medium ml-3">{a.startTime}</span>
                        {a.firstName} {a.lastName}
                      </span>
                      <Badge className={APPOINTMENT_STATUS_COLORS[a.status]}>
                        {label(APPOINTMENT_STATUSES, a.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <h2 className="font-bold mb-3">סיכומי טיפול אחרונים</h2>
          <Card>
            {recentNotes.length === 0 ? (
              <EmptyState message="אין סיכומים עדיין" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentNotes.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/patients/${n.patientId}?tab=notes`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-medium">{n.firstName} {n.lastName}</span>
                        <span className="text-gray-500 mr-2">· {n.title}</span>
                      </span>
                      <span className="text-gray-400 text-xs">{formatDate(n.date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
