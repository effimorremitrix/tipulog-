import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { PATIENT_STATUSES, label } from "@/lib/labels";
import { Badge, Card, EmptyState, LinkButton, PageHeader, inputClass } from "@/components/ui";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  const rows = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.userId, user.id),
        search
          ? or(
              like(patients.firstName, `%${search}%`),
              like(patients.lastName, `%${search}%`),
              like(patients.phone, `%${search}%`),
              like(patients.idNumber, `%${search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(patients.createdAt));

  return (
    <div>
      <PageHeader
        title="מטופלים"
        action={<LinkButton href="/patients/new">+ מטופל חדש</LinkButton>}
      />
      <form className="mb-4 max-w-sm">
        <input
          name="q"
          defaultValue={search}
          placeholder="חיפוש לפי שם, טלפון או ת״ז…"
          className={inputClass}
        />
      </form>
      <Card>
        {rows.length === 0 ? (
          <EmptyState message={search ? "לא נמצאו מטופלים תואמים" : "אין עדיין מטופלים – הוסיפו את המטופל הראשון"} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">טלפון</th>
                <th className="px-4 py-3 font-medium">אימייל</th>
                <th className="px-4 py-3 font-medium">תאריך הצטרפות</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/patients/${p.id}`} className="font-medium text-primary-dark hover:underline">
                      {p.firstName} {p.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3" dir="ltr">{p.phone}</td>
                  <td className="px-4 py-3" dir="ltr">{p.email}</td>
                  <td className="px-4 py-3">{formatDate(p.createdAt.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.status === "active"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-gray-100 text-gray-500 border-gray-300"
                      }
                    >
                      {label(PATIENT_STATUSES, p.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
