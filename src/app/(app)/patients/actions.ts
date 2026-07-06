"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { patients, sessionNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";

function patientValues(formData: FormData) {
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  return {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    idNumber: str("idNumber"),
    phone: str("phone"),
    email: str("email"),
    birthDate: str("birthDate"),
    address: str("address"),
    status: String(formData.get("status") ?? "active"),
    referralSource: str("referralSource"),
    notes: str("notes"),
  };
}

export async function createPatient(formData: FormData) {
  const user = await requireUser();
  const values = patientValues(formData);
  if (!values.firstName || !values.lastName) redirect("/patients/new?error=1");
  const [patient] = await db
    .insert(patients)
    .values({ ...values, userId: user.id })
    .returning();
  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(patientId: number, formData: FormData) {
  const user = await requireUser();
  const values = patientValues(formData);
  if (!values.firstName || !values.lastName) {
    redirect(`/patients/${patientId}?error=1`);
  }
  await db
    .update(patients)
    .set(values)
    .where(and(eq(patients.id, patientId), eq(patients.userId, user.id)));
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?saved=1`);
}

export async function createSessionNote(formData: FormData) {
  const user = await requireUser();
  const patientId = Number(formData.get("patientId"));
  const appointmentIdRaw = Number(formData.get("appointmentId"));
  const title = String(formData.get("title") ?? "").trim() || "סיכום פגישה";
  const body = String(formData.get("body") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim() || todayISO();

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, user.id)),
  });
  if (!patient || !body) redirect(`/patients/${patientId}?tab=notes&error=1`);

  await db.insert(sessionNotes).values({
    userId: user.id,
    patientId,
    appointmentId: Number.isInteger(appointmentIdRaw) && appointmentIdRaw > 0 ? appointmentIdRaw : null,
    date,
    title,
    body,
  });
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=notes`);
}

export async function deleteSessionNote(noteId: number, patientId: number) {
  const user = await requireUser();
  await db
    .delete(sessionNotes)
    .where(and(eq(sessionNotes.id, noteId), eq(sessionNotes.userId, user.id)));
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=notes`);
}
