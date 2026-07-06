import type { Patient } from "@/db/schema";
import { Button, Field, inputClass } from "@/components/ui";
import { PATIENT_STATUSES } from "@/lib/labels";

export function PatientForm({
  action,
  patient,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  patient?: Patient;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="שם פרטי *">
        <input name="firstName" required defaultValue={patient?.firstName} className={inputClass} />
      </Field>
      <Field label="שם משפחה *">
        <input name="lastName" required defaultValue={patient?.lastName} className={inputClass} />
      </Field>
      <Field label="תעודת זהות">
        <input name="idNumber" defaultValue={patient?.idNumber ?? ""} dir="ltr" className={inputClass} />
      </Field>
      <Field label="טלפון">
        <input name="phone" type="tel" defaultValue={patient?.phone ?? ""} dir="ltr" className={inputClass} />
      </Field>
      <Field label="אימייל">
        <input name="email" type="email" defaultValue={patient?.email ?? ""} dir="ltr" className={inputClass} />
      </Field>
      <Field label="תאריך לידה">
        <input name="birthDate" type="date" defaultValue={patient?.birthDate ?? ""} className={inputClass} />
      </Field>
      <Field label="כתובת" className="md:col-span-2">
        <input name="address" defaultValue={patient?.address ?? ""} className={inputClass} />
      </Field>
      <Field label="סטטוס">
        <select name="status" defaultValue={patient?.status ?? "active"} className={inputClass}>
          {Object.entries(PATIENT_STATUSES).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </Field>
      <Field label="מקור הפניה">
        <input name="referralSource" defaultValue={patient?.referralSource ?? ""} className={inputClass} />
      </Field>
      <Field label="הערות כלליות" className="md:col-span-2">
        <textarea name="notes" rows={3} defaultValue={patient?.notes ?? ""} className={inputClass} />
      </Field>
      <div className="md:col-span-2">
        <Button>{submitLabel}</Button>
      </div>
    </form>
  );
}
