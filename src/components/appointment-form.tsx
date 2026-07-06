import type { Appointment, Patient } from "@/db/schema";
import { Button, Field, inputClass } from "@/components/ui";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "@/lib/labels";

export function AppointmentForm({
  action,
  patientsList,
  appointment,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  patientsList: Patient[];
  appointment?: Appointment;
  defaults?: { date?: string; time?: string; patientId?: number };
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="מטופל/ת *" className="md:col-span-2">
        <select
          name="patientId"
          required
          defaultValue={appointment?.patientId ?? defaults?.patientId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            בחרו מטופל/ת…
          </option>
          {patientsList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="תאריך *">
        <input
          name="date"
          type="date"
          required
          defaultValue={appointment?.date ?? defaults?.date ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="שעת התחלה *">
        <input
          name="startTime"
          type="time"
          required
          defaultValue={appointment?.startTime ?? defaults?.time ?? "09:00"}
          className={inputClass}
        />
      </Field>
      <Field label="משך (דקות)">
        <input
          name="durationMin"
          type="number"
          min={5}
          step={5}
          defaultValue={appointment?.durationMin ?? 50}
          className={inputClass}
        />
      </Field>
      <Field label="סוג פגישה">
        <select name="type" defaultValue={appointment?.type ?? "session"} className={inputClass}>
          {Object.entries(APPOINTMENT_TYPES).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </Field>
      <Field label="מחיר (₪)">
        <input
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={appointment?.price ?? 350}
          className={inputClass}
        />
      </Field>
      <Field label="מיקום / חדר">
        <input name="location" defaultValue={appointment?.location ?? ""} className={inputClass} />
      </Field>
      {appointment && (
        <Field label="סטטוס">
          <select name="status" defaultValue={appointment.status} className={inputClass}>
            {Object.entries(APPOINTMENT_STATUSES).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="הערה" className="md:col-span-2">
        <textarea name="note" rows={2} defaultValue={appointment?.note ?? ""} className={inputClass} />
      </Field>
      <div className="md:col-span-2">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}
