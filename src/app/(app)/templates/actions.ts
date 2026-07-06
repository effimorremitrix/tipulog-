"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { noteTemplates } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function createTemplate(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!name || !body) redirect("/templates?error=1");
  await db.insert(noteTemplates).values({ userId: user.id, name, body });
  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateTemplate(templateId: number, formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!name || !body) redirect(`/templates?edit=${templateId}&error=1`);
  await db
    .update(noteTemplates)
    .set({ name, body })
    .where(and(eq(noteTemplates.id, templateId), eq(noteTemplates.userId, user.id)));
  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplate(templateId: number) {
  const user = await requireUser();
  await db
    .delete(noteTemplates)
    .where(and(eq(noteTemplates.id, templateId), eq(noteTemplates.userId, user.id)));
  revalidatePath("/templates");
  redirect("/templates");
}
