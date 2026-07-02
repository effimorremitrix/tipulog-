import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, payments } from "@/db/schema";

export type Balance = { charged: number; paid: number; balance: number };

/** Charges are completed appointments; balance = charged - paid. */
export async function getPatientBalance(
  userId: number,
  patientId: number
): Promise<Balance> {
  const [chargedRow] = await db
    .select({ total: sql<number>`coalesce(sum(${appointments.price}), 0)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        eq(appointments.patientId, patientId),
        eq(appointments.status, "completed")
      )
    );
  const [paidRow] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.patientId, patientId)));
  const charged = chargedRow?.total ?? 0;
  const paid = paidRow?.total ?? 0;
  return { charged, paid, balance: charged - paid };
}

export async function nextReceiptNumber(userId: number): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${payments.receiptNumber}), 1000)` })
    .from(payments)
    .where(eq(payments.userId, userId));
  return (row?.max ?? 1000) + 1;
}
