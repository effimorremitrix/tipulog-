import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { getSessionUserId } from "@/lib/session";

export async function currentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (userId == null) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
