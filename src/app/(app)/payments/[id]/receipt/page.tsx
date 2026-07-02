import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_METHODS, label } from "@/lib/labels";
import { Card } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, Number(id)), eq(payments.userId, user.id)),
  });
  if (!payment) notFound();

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, payment.patientId), eq(patients.userId, user.id)),
  });

  return (
    <div className="max-w-xl mx-auto">
      <div className="no-print flex items-center justify-between mb-4">
        <Link href={`/patients/${payment.patientId}?tab=payments`} className="text-sm text-primary-dark hover:underline">
          → חזרה לתיק המטופל
        </Link>
        <PrintButton />
      </div>
      <Card className="p-10">
        <div className="text-center border-b border-gray-200 pb-6 mb-6">
          <div className="text-2xl font-bold">{user.clinicName || user.name}</div>
          <div className="text-gray-500 text-sm mt-1">{user.name} · {user.email}</div>
        </div>
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-bold">קבלה מס׳ {payment.receiptNumber}</div>
          <div className="text-gray-500">{formatDate(payment.date)}</div>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">התקבל מאת</dt>
            <dd className="font-medium">
              {patient?.firstName} {patient?.lastName}
              {patient?.idNumber ? ` (ת״ז ${patient.idNumber})` : ""}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">עבור</dt>
            <dd>שירותי טיפול</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">אמצעי תשלום</dt>
            <dd>{label(PAYMENT_METHODS, payment.method)}</dd>
          </div>
          {payment.note && (
            <div className="flex justify-between">
              <dt className="text-gray-500">הערה</dt>
              <dd>{payment.note}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-4 mt-4 text-base">
            <dt className="font-bold">סה״כ</dt>
            <dd className="font-bold">{formatMoney(payment.amount)}</dd>
          </div>
        </dl>
        <div className="text-center text-xs text-gray-400 mt-10">
          הופק באמצעות טיפולוג · אין מסמך זה מהווה חשבונית מס
        </div>
      </Card>
    </div>
  );
}
