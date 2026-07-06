"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, patients, sessionNotes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { deleteFile, makeKey, saveFile } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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

export async function uploadDocument(formData: FormData) {
  const user = await requireUser();
  const patientId = Number(formData.get("patientId"));
  const file = formData.get("file");

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, user.id)),
  });
  if (
    !patient ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_UPLOAD_BYTES
  ) {
    redirect(`/patients/${patientId}?tab=documents&error=1`);
  }

  const key = makeKey(user.id, file.name);
  const driver = await saveFile(
    key,
    Buffer.from(await file.arrayBuffer()),
    file.type || "application/octet-stream"
  );
  await db.insert(documents).values({
    userId: user.id,
    patientId,
    fileName: file.name,
    storedKey: key,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storage: driver,
  });
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=documents`);
}

export async function deleteDocument(documentId: number, patientId: number) {
  const user = await requireUser();
  const doc = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), eq(documents.userId, user.id)),
  });
  if (doc) {
    await deleteFile(doc.storedKey, doc.storage as "local" | "s3");
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));
  }
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=documents`);
}

export async function deleteSessionNote(noteId: number, patientId: number) {
  const user = await requireUser();
  await db
    .delete(sessionNotes)
    .where(and(eq(sessionNotes.id, noteId), eq(sessionNotes.userId, user.id)));
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?tab=notes`);
}
