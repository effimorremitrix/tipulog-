import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, formatMoney, todayISO } from "@/lib/format";
import { PAYMENT_METHODS, label } from "@/lib/labels";
import { Card, EmptyState, PageHeader, inputClass } from "@/components/ui";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayISO();
  const from = sp.from || addDays(today, -30);
  const to = sp.to || today;

  const where = and(
    eq(payments.userId, user.id),
    gte(payments.date, from),
    lte(payments.date, to)
  );

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: payments.id,
        receiptNumber: payments.receiptNumber,
        date: payments.date,
        amount: payments.amount,
        method: payments.method,
        note: payments.note,
        patientId: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(payments)
      .innerJoin(patients, eq(payments.patientId, patients.id))
      .where(where)
      .orderBy(desc(payments.date), desc(payments.id)),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(where),
  ]);

  return (
    <div>
      <PageHeader title="תשלומים" />
      <form className="flex flex-wrap items-end gap-3 mb-4 text-sm">
        <label>
          <span className="block text-gray-500 mb-1">מתאריך</span>
          <input name="from" type="date" defaultValue={from} className={inputClass} />
        </label>
        <label>
          <span className="block text-gray-500 mb-1">עד תאריך</span>
          <input name="to" type="date" defaultValue={to} className={inputClass} />
        </label>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50">
          סינון
        </button>
        <span className="mr-auto text-gray-600">
          סה״כ בתקופה: <span className="font-bold">{formatMoney(totals?.total ?? 0)}</span>
        </span>
      </form>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="אין תשלומים בטווח התאריכים שנבחר" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">קבלה</th>
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3 font-medium">מטופל/ת</th>
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
                  <td className="px-4 py-3">
                    <Link href={`/patients/${p.patientId}?tab=payments`} className="hover:underline">
                      {p.firstName} {p.lastName}
                    </Link>
                  </td>
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
