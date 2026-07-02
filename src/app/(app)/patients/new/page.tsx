import { Card, PageHeader } from "@/components/ui";
import { PatientForm } from "@/components/patient-form";
import { requireUser } from "@/lib/auth";
import { createPatient } from "../actions";

export default async function NewPatientPage() {
  await requireUser();
  return (
    <div>
      <PageHeader title="מטופל חדש" />
      <Card className="p-6">
        <PatientForm action={createPatient} submitLabel="שמירת מטופל" />
      </Card>
    </div>
  );
}
