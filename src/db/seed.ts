import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  appointments,
  noteTemplates,
  patients,
  payments,
  sessionNotes,
  settings,
  users,
} from "./schema";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const existing = await db.query.users.findFirst();
  if (existing) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const [user] = await db
    .insert(users)
    .values({
      name: "ד\"ר דנה לוי",
      email: "demo@tipulog.local",
      passwordHash,
      clinicName: "קליניקת דנה לוי",
    })
    .returning();

  await db.insert(settings).values({
    userId: user.id,
    whatsappEnabled: 1,
    whatsappNumber: "+972500000000",
    workStart: "09:00",
    workEnd: "17:00",
    slotMinutes: 60,
    defaultPrice: 350,
  });

  const patientRows = await db
    .insert(patients)
    .values(
      [
        ["יעל", "כהן", "038274651", "050-1234567", "yael@example.com", "1988-04-12", "תל אביב, דיזנגוף 100", "המלצה מרופא משפחה"],
        ["אורי", "מזרחי", "025839174", "052-2345678", "uri@example.com", "1975-11-03", "רמת גן, ביאליק 12", "חבר"],
        ["נועה", "פרידמן", "031948562", "054-3456789", "noa@example.com", "1992-07-21", "הרצליה, סוקולוב 8", "אינטרנט"],
        ["איתן", "ברק", "029384756", "053-4567890", "eitan@example.com", "1969-02-14", "כפר סבא, ויצמן 45", "קופת חולים"],
        ["מיכל", "אברהם", "034857291", "050-5678901", "michal@example.com", "1996-09-30", "תל אביב, אבן גבירול 60", "אינסטגרם"],
        ["דוד", "שמעוני", "027465839", "052-6789012", "david@example.com", "1981-12-25", "פתח תקווה, רוטשילד 3", "המלצה"],
        ["רות", "גולן", "036172845", "054-7890123", "ruth@example.com", "1958-06-08", "רעננה, אחוזה 120", "רופא משפחה"],
        ["עומר", "נחום", "032918475", "050-8901234", "omer@example.com", "2001-03-17", "הוד השרון, הבנים 7", "הורים"],
        ["שירה", "אלון", "038291746", "052-9012345", "shira@example.com", "1990-10-05", "גבעתיים, כצנלסון 22", "אינטרנט"],
        ["יונתן", "רוזן", "024681357", "053-0123456", "yonatan@example.com", "1985-08-19", "תל אביב, ארלוזורוב 15", "עמית לעבודה"],
      ].map(([firstName, lastName, idNumber, phone, email, birthDate, address, referralSource], i) => ({
        userId: user.id,
        firstName,
        lastName,
        idNumber,
        phone,
        email,
        birthDate,
        address,
        referralSource,
        status: i === 9 ? "inactive" : "active",
      }))
    )
    .returning();

  await db.insert(noteTemplates).values([
    {
      userId: user.id,
      name: "סיכום פגישה טיפולית",
      body: "נושאים מרכזיים:\n\nמצב רגשי:\n\nהתערבויות:\n\nמשימות להמשך:\n\nהערות:",
    },
    {
      userId: user.id,
      name: "אינטייק – פגישה ראשונה",
      body: "פנייה ורקע:\n\nהיסטוריה רפואית ונפשית:\n\nמצב משפחתי ותעסוקתי:\n\nמטרות הטיפול:\n\nהתרשמות ראשונית:\n\nתוכנית טיפול:",
    },
    {
      userId: user.id,
      name: "שיחת מעקב",
      body: "מצב נוכחי:\n\nשינויים מאז הפגישה האחרונה:\n\nהמלצות:",
    },
  ]);

  const today = new Date();
  const week0 = addDays(today, -today.getDay()); // Sunday of current week
  const times = ["09:00", "10:00", "11:00", "12:30", "16:00", "17:00", "18:00"];
  const apptRows: (typeof appointments.$inferInsert)[] = [];

  // Three weeks of history + current week + next week
  for (let w = -3; w <= 1; w++) {
    for (let d = 0; d < 5; d++) {
      const date = iso(addDays(week0, w * 7 + d));
      const count = (d + w + 10) % 3 === 0 ? 2 : 3;
      for (let s = 0; s < count; s++) {
        const patient = patientRows[(d * 3 + s + w + 30) % patientRows.length];
        const past = date < iso(today);
        const statusPool = ["completed", "completed", "completed", "noshow", "cancelled"];
        apptRows.push({
          userId: user.id,
          patientId: patient.id,
          date,
          startTime: times[(d + s * 2) % times.length],
          durationMin: 50,
          type: s === 0 && w === -3 ? "intake" : "session",
          location: "חדר 1",
          status: past ? statusPool[(d + s + w + 10) % statusPool.length] : "scheduled",
          price: 350,
        });
      }
    }
  }
  const insertedAppts = await db.insert(appointments).values(apptRows).returning();

  const noteBodies = [
    "המטופל/ת שיתפ/ה בקשיים בשבוע האחרון. עבדנו על זיהוי מחשבות אוטומטיות ותרגול נשימות. נקבעו משימות בית לתרגול יומי.",
    "פגישה ממוקדת בנושא יחסים בין-אישיים. נצפתה התקדמות ביכולת הביטוי הרגשי. נמשיך בעבודה על הצבת גבולות.",
    "עסקנו בעיבוד אירוע מהעבר. המטופל/ת הפגינ/ה פתיחות ושיתוף פעולה. מומלץ להמשיך בתדירות שבועית.",
  ];
  const completed = insertedAppts.filter((a) => a.status === "completed");
  await db.insert(sessionNotes).values(
    completed.slice(0, 20).map((a, i) => ({
      userId: user.id,
      patientId: a.patientId,
      appointmentId: a.id,
      date: a.date,
      title: "סיכום פגישה",
      body: noteBodies[i % noteBodies.length],
    }))
  );

  let receiptNumber = 1001;
  await db.insert(payments).values(
    completed.slice(0, 25).map((a) => ({
      userId: user.id,
      patientId: a.patientId,
      appointmentId: a.id,
      amount: a.price,
      method: (["cash", "transfer", "card", "check"] as const)[a.id % 4],
      date: a.date,
      receiptNumber: receiptNumber++,
    }))
  );

  console.log("Seeded demo data:");
  console.log("  email:    demo@tipulog.local");
  console.log("  password: demo1234");
}

main().then(() => process.exit(0));
