"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/session";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clinicName = String(formData.get("clinicName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    redirect("/register?error=missing");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) redirect("/register?error=exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, clinicName: clinicName || null })
    .returning();

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
