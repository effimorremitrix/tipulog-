import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, payments } from "@/db/schema";

export async function sessionsReport(userId: number, from: string, to: string) {
  return db
    .select({
      date: appointments.date,
      startTime: appointments.startTime,
      firstName: patients.firstName,
      lastName: patients.lastName,
      type: appointments.type,
      status: appointments.status,
      price: appointments.price,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.userId, userId),
        gte(appointments.date, from),
        lte(appointments.date, to)
      )
    )
    .orderBy(asc(appointments.date), asc(appointments.startTime));
}

export async function collectionsReport(userId: number, from: string, to: string) {
  return db
    .select({
      date: payments.date,
      receiptNumber: payments.receiptNumber,
      firstName: patients.firstName,
      lastName: patients.lastName,
      method: payments.method,
      amount: payments.amount,
    })
    .from(payments)
    .innerJoin(patients, eq(payments.patientId, patients.id))
    .where(and(eq(payments.userId, userId), gte(payments.date, from), lte(payments.date, to)))
    .orderBy(asc(payments.date), asc(payments.receiptNumber));
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((r) => r.map(escape).join(","));
  // UTF-8 BOM so Hebrew opens correctly in Excel
  return "﻿" + lines.join("\r\n");
}
