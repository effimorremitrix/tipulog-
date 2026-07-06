import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, formatMoney, todayISO } from "@/lib/format";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_COLORS, APPOINTMENT_TYPES, PAYMENT_METHODS, label } from "@/lib/labels";
import { collectionsReport, sessionsReport } from "@/lib/reports";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const type = sp.type === "collections" ? "collections" : "sessions";
  const today = todayISO();
  const from = sp.from || addDays(today, -30);
  const to = sp.to || today;

  const csvHref = `/api/reports/csv?type=${type}&from=${from}&to=${to}`;

  return (
    <div>
      <PageHeader title="דוחות" />

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: "sessions", label: "יומן פגישות" },
          { key: "collections", label: "גבייה" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/reports?type=${t.key}&from=${from}&to=${to}`}
            className={`px-4 py-2 text-sm rounded-t-lg border border-b-0 ${
              type === t.key
                ? "bg-white border-gray-200 font-medium text-primary-dark"
                : "bg-transparent border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-3 mb-4 text-sm">
        <input type="hidden" name="type" value={type} />
        <label>
          <span className="block text-gray-500 mb-1">מתאריך</span>
          <input name="from" type="date" defaultValue={from} className={inputClass} />
        </label>
        <label>
          <span className="block text-gray-500 mb-1">עד תאריך</span>
          <input name="to" type="date" defaultValue={to} className={inputClass} />
        </label>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50">
          הצגה
        </button>
        <a
          href={csvHref}
          className="mr-auto rounded-lg bg-primary hover:bg-primary-dark text-white px-4 py-2 font-medium"
        >
          ⬇ ייצוא ל-CSV
        </a>
      </form>

      {type === "sessions" ? (
        <SessionsTable userId={user.id} from={from} to={to} />
      ) : (
        <CollectionsTable userId={user.id} from={from} to={to} />
      )}
    </div>
  );
}

async function SessionsTable({ userId, from, to }: { userId: number; from: string; to: string }) {
  const rows = await sessionsReport(userId, from, to);
  const completed = rows.filter((r) => r.status === "completed");
  const revenue = completed.reduce((sum, r) => sum + r.price, 0);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500">סה״כ פגישות</div>
          <div className="text-xl font-bold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">התקיימו</div>
          <div className="text-xl font-bold text-emerald-700">{completed.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">ביטולים / אי-הגעה</div>
          <div className="text-xl font-bold text-amber-600">
            {rows.filter((r) => r.status === "cancelled" || r.status === "noshow").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">הכנסות (פגישות שהתקיימו)</div>
          <div className="text-xl font-bold">{formatMoney(revenue)}</div>
        </Card>
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState message="אין פגישות בטווח שנבחר" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3 font-medium">שעה</th>
                <th className="px-4 py-3 font-medium">מטופל/ת</th>
                <th className="px-4 py-3 font-medium">סוג</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">מחיר</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3">{r.startTime}</td>
                  <td className="px-4 py-3">{r.firstName} {r.lastName}</td>
                  <td className="px-4 py-3">{label(APPOINTMENT_TYPES, r.type)}</td>
                  <td className="px-4 py-3">
                    <Badge className={APPOINTMENT_STATUS_COLORS[r.status]}>
                      {label(APPOINTMENT_STATUSES, r.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatMoney(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

async function CollectionsTable({ userId, from, to }: { userId: number; from: string; to: string }) {
  const rows = await collectionsReport(userId, from, to);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <Card className="p-4 mb-4 max-w-xs">
        <div className="text-xs text-gray-500">סה״כ גבייה בתקופה</div>
        <div className="text-xl font-bold text-emerald-700">{formatMoney(total)}</div>
      </Card>
      <Card>
        {rows.length === 0 ? (
          <EmptyState message="אין תשלומים בטווח שנבחר" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">תאריך</th>
                <th className="px-4 py-3 font-medium">קבלה</th>
                <th className="px-4 py-3 font-medium">מטופל/ת</th>
                <th className="px-4 py-3 font-medium">אמצעי</th>
                <th className="px-4 py-3 font-medium">סכום</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3">#{r.receiptNumber}</td>
                  <td className="px-4 py-3">{r.firstName} {r.lastName}</td>
                  <td className="px-4 py-3">{label(PAYMENT_METHODS, r.method)}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
