import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addDays, dayName, formatDate, todayISO, weekStart } from "@/lib/format";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/labels";
import { Card, LinkButton, PageHeader } from "@/components/ui";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00–20:00

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const { week } = await searchParams;
  const today = todayISO();
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(week ?? "") ? week! : today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];

  const rows = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      durationMin: appointments.durationMin,
      status: appointments.status,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.userId, user.id),
        gte(appointments.date, start),
        lte(appointments.date, end)
      )
    )
    .orderBy(asc(appointments.startTime));

  const byCell = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.date}|${Number(r.startTime.slice(0, 2))}`;
    const list = byCell.get(key) ?? [];
    list.push(r);
    byCell.set(key, list);
  }

  return (
    <div>
      <PageHeader
        title="יומן"
        action={<LinkButton href={`/calendar/new?date=${today}`}>+ פגישה חדשה</LinkButton>}
      />
      <div className="flex items-center gap-3 mb-4 text-sm">
        <Link href={`/calendar?week=${addDays(start, -7)}`} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50">
          → שבוע קודם
        </Link>
        <Link href={`/calendar?week=${today}`} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50">
          השבוע
        </Link>
        <Link href={`/calendar?week=${addDays(start, 7)}`} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50">
          שבוע הבא ←
        </Link>
        <span className="text-gray-500">
          {formatDate(start)} – {formatDate(end)}
        </span>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-xs table-fixed min-w-[880px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-14 px-2 py-2 text-gray-400 font-normal">שעה</th>
              {days.map((d) => (
                <th
                  key={d}
                  className={`px-2 py-2 font-medium ${d === today ? "bg-primary-light/60 text-primary-dark" : "text-gray-600"}`}
                >
                  <div>{dayName(d)}</div>
                  <div className="font-normal text-gray-400">{formatDate(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className="border-b border-gray-100 last:border-0">
                <td className="px-2 py-1 text-gray-400 align-top text-center">
                  {String(hour).padStart(2, "0")}:00
                </td>
                {days.map((d) => {
                  const cellAppts = byCell.get(`${d}|${hour}`) ?? [];
                  return (
                    <td key={d} className={`align-top p-1 h-14 ${d === today ? "bg-primary-light/20" : ""}`}>
                      {cellAppts.map((a) => (
                        <Link
                          key={a.id}
                          href={`/calendar/${a.id}`}
                          className={`block rounded-md border px-1.5 py-1 mb-1 leading-tight hover:opacity-80 ${APPOINTMENT_STATUS_COLORS[a.status]}`}
                        >
                          <span className="font-medium">{a.startTime}</span>{" "}
                          {a.firstName} {a.lastName}
                        </Link>
                      ))}
                      <Link
                        href={`/calendar/new?date=${d}&time=${String(hour).padStart(2, "0")}:00`}
                        className="block text-transparent hover:text-gray-300 text-center select-none"
                        aria-label="פגישה חדשה"
                      >
                        +
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
