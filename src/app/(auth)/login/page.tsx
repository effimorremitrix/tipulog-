import Link from "next/link";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { login } from "../actions";

const ERRORS: Record<string, string> = {
  missing: "יש למלא אימייל וסיסמה",
  invalid: "אימייל או סיסמה שגויים",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <Card className="p-8">
      <h1 className="text-xl font-bold mb-6">התחברות</h1>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {ERRORS[error] ?? "אירעה שגיאה, נסו שוב"}
        </div>
      )}
      <form action={login} className="space-y-4">
        <Field label="אימייל">
          <input name="email" type="email" required dir="ltr" className={inputClass} />
        </Field>
        <Field label="סיסמה">
          <input name="password" type="password" required dir="ltr" className={inputClass} />
        </Field>
        <Button>התחברות</Button>
      </form>
      <p className="text-sm text-gray-500 mt-6">
        אין לכם חשבון עדיין?{" "}
        <Link href="/register" className="text-primary-dark font-medium hover:underline">
          הרשמה
        </Link>
      </p>
    </Card>
  );
}
