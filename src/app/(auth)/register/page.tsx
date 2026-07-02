import Link from "next/link";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { register } from "../actions";

const ERRORS: Record<string, string> = {
  missing: "יש למלא את כל השדות (סיסמה: 8 תווים לפחות)",
  exists: "כבר קיים חשבון עם האימייל הזה",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <Card className="p-8">
      <h1 className="text-xl font-bold mb-6">פתיחת חשבון מטפל/ת</h1>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {ERRORS[error] ?? "אירעה שגיאה, נסו שוב"}
        </div>
      )}
      <form action={register} className="space-y-4">
        <Field label="שם מלא">
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="שם הקליניקה (אופציונלי)">
          <input name="clinicName" className={inputClass} />
        </Field>
        <Field label="אימייל">
          <input name="email" type="email" required dir="ltr" className={inputClass} />
        </Field>
        <Field label="סיסמה (8 תווים לפחות)">
          <input name="password" type="password" minLength={8} required dir="ltr" className={inputClass} />
        </Field>
        <Button>הרשמה</Button>
      </form>
      <p className="text-sm text-gray-500 mt-6">
        כבר יש לכם חשבון?{" "}
        <Link href="/login" className="text-primary-dark font-medium hover:underline">
          התחברות
        </Link>
      </p>
    </Card>
  );
}
