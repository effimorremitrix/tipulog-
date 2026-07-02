import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { noteTemplates } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Button, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { createTemplate, deleteTemplate, updateTemplate } from "./actions";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { edit, error } = await searchParams;

  const templates = await db
    .select()
    .from(noteTemplates)
    .where(eq(noteTemplates.userId, user.id))
    .orderBy(asc(noteTemplates.name));

  const editing = templates.find((t) => String(t.id) === edit);

  return (
    <div>
      <PageHeader title="תבניות סיכום טיפול" />
      <p className="text-sm text-gray-500 -mt-4 mb-6">
        תבניות עם שדות קבועים לסיכומי טיפול – זמינות לבחירה בכתיבת סיכום חדש בתיק המטופל.
      </p>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          יש למלא שם ותוכן לתבנית
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-bold mb-4">{editing ? `עריכת תבנית: ${editing.name}` : "תבנית חדשה"}</h2>
          <form
            action={editing ? updateTemplate.bind(null, editing.id) : createTemplate}
            className="space-y-4"
          >
            <Field label="שם התבנית *">
              <input name="name" required defaultValue={editing?.name} key={editing?.id ?? "new"} className={inputClass} />
            </Field>
            <Field label="תוכן (שלד הסיכום) *">
              <textarea
                name="body"
                rows={10}
                required
                defaultValue={editing?.body}
                key={`body-${editing?.id ?? "new"}`}
                className={inputClass}
              />
            </Field>
            <div className="flex gap-3">
              <Button>{editing ? "שמירת שינויים" : "יצירת תבנית"}</Button>
              {editing && (
                <Link href="/templates" className="text-sm text-gray-500 self-center hover:underline">
                  ביטול עריכה
                </Link>
              )}
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <EmptyState message="אין תבניות עדיין" />
            </Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">{t.name}</div>
                  <div className="flex gap-3 text-xs">
                    <Link href={`/templates?edit=${t.id}`} className="text-primary-dark hover:underline">
                      עריכה
                    </Link>
                    <form action={deleteTemplate.bind(null, t.id)}>
                      <button className="text-red-500 hover:underline">מחיקה</button>
                    </form>
                  </div>
                </div>
                <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans line-clamp-6">{t.body}</pre>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
