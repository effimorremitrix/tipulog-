"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { patients, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { nextReceiptNumber } from "@/lib/queries";

export async function createPayment(formData: FormData) {
  const user = await requireUser();
  const patientId = Number(formData.get("patientId"));
  const appointmentIdRaw = Number(formData.get("appointmentId"));
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "cash");
  const date = String(formData.get("date") ?? "").trim() || todayISO();
  const note = String(formData.get("note") ?? "").trim() || null;
  const backTo = String(formData.get("backTo") ?? `/patients/${patientId}?tab=payments`);

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, user.id)),
  });
  if (!patient || !Number.isFinite(amount) || amount <= 0) {
    redirect(`/patients/${patientId}?tab=payments&error=1`);
  }

  const [payment] = await db
    .insert(payments)
    .values({
      userId: user.id,
      patientId,
      appointmentId:
        Number.isInteger(appointmentIdRaw) && appointmentIdRaw > 0 ? appointmentIdRaw : null,
      amount,
      method,
      date,
      receiptNumber: await nextReceiptNumber(user.id),
      note,
    })
    .returning();

  revalidatePath("/payments");
  revalidatePath(`/patients/${patientId}`);
  redirect(`${backTo}${backTo.includes("?") ? "&" : "?"}receipt=${payment.id}`);
}

export async function deletePayment(paymentId: number, backTo: string) {
  const user = await requireUser();
  await db
    .delete(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.userId, user.id)));
  revalidatePath("/payments");
  redirect(backTo);
}
