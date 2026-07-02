import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  clinicName: text("clinic_name"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  idNumber: text("id_number"),
  phone: text("phone"),
  email: text("email"),
  birthDate: text("birth_date"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  referralSource: text("referral_source"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  durationMin: integer("duration_min").notNull().default(50),
  type: text("type").notNull().default("session"),
  location: text("location"),
  status: text("status").notNull().default("scheduled"),
  price: real("price").notNull().default(0),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessionNotes = sqliteTable("session_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  date: text("date").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const noteTemplates = sqliteTable("note_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  body: text("body").notNull(),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  amount: real("amount").notNull(),
  method: text("method").notNull().default("cash"),
  date: text("date").notNull(), // YYYY-MM-DD
  receiptNumber: integer("receipt_number").notNull(),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type NoteTemplate = typeof noteTemplates.$inferSelect;
export type Payment = typeof payments.$inferSelect;
