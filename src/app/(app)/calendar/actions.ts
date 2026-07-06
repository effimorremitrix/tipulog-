"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appointments, patients, payments, sessionNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function appointmentValues(formData: FormData) {
  return {
    patientId: Number(formData.get("patientId")),
    date: String(formData.get("date") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    durationMin: Number(formData.get("durationMin")) || 50,
    type: String(formData.get("type") ?? "session"),
    location: String(formData.get("location") ?? "").trim() || null,
    status: String(formData.get("status") ?? "scheduled"),
    price: Number(formData.get("price")) || 0,
    note: String(formData.get("note") ?? "").trim() || null,
  };
}

async function assertPatientOwned(userId: number, patientId: number) {
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, userId)),
  });
  return !!patient;
}

export async function createAppointment(formData: FormData) {
  const user = await requireUser();
  const values = appointmentValues(formData);
  if (
    !values.date ||
    !values.startTime ||
    !Number.isInteger(values.patientId) ||
    !(await assertPatientOwned(user.id, values.patientId))
  ) {
    redirect("/calendar/new?error=1");
  }
  await db.insert(appointments).values({ ...values, userId: user.id });
  revalidatePath("/calendar");
  redirect(`/calendar?week=${values.date}`);
}

export async function updateAppointment(appointmentId: number, formData: FormData) {
  const user = await requireUser();
  const values = appointmentValues(formData);
  if (
    !values.date ||
    !values.startTime ||
    !Number.isInteger(values.patientId) ||
    !(await assertPatientOwned(user.id, values.patientId))
  ) {
    redirect(`/calendar/${appointmentId}?error=1`);
  }
  await db
    .update(appointments)
    .set(values)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, user.id)));
  revalidatePath("/calendar");
  redirect(`/calendar?week=${values.date}`);
}

export async function setAppointmentStatus(
  appointmentId: number,
  status: string,
  backTo: string
) {
  const user = await requireUser();
  await db
    .update(appointments)
    .set({ status })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, user.id)));
  revalidatePath("/calendar");
  redirect(backTo);
}

export async function deleteAppointment(appointmentId: number) {
  const user = await requireUser();
  const appt = await db.query.appointments.findFirst({
    where: and(eq(appointments.id, appointmentId), eq(appointments.userId, user.id)),
  });
  if (appt) {
    // Detach dependent records before deleting (FK constraints are on).
    await db
      .update(sessionNotes)
      .set({ appointmentId: null })
      .where(eq(sessionNotes.appointmentId, appointmentId));
    await db
      .update(payments)
      .set({ appointmentId: null })
      .where(eq(payments.appointmentId, appointmentId));
    await db
      .delete(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, user.id)));
  }
  revalidatePath("/calendar");
  redirect(`/calendar${appt ? `?week=${appt.date}` : ""}`);
}
