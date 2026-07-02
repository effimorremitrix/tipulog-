import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addDays, formatDate, todayISO } from "@/lib/format";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, PAYMENT_METHODS, label } from "@/lib/labels";
import { collectionsReport, sessionsReport, toCsv } from "@/lib/reports";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const params = request.nextUrl.searchParams;
  const type = params.get("type") ?? "sessions";
  const today = todayISO();
  const from = params.get("from") || addDays(today, -30);
  const to = params.get("to") || today;

  let csv: string;
  if (type === "collections") {
    const rows = await collectionsReport(user.id, from, to);
    csv = toCsv(
      ["תאריך", "מס' קבלה", "מטופל/ת", "אמצעי תשלום", "סכום"],
      rows.map((r) => [
        formatDate(r.date),
        r.receiptNumber,
        `${r.firstName} ${r.lastName}`,
        label(PAYMENT_METHODS, r.method),
        r.amount,
      ])
    );
  } else {
    const rows = await sessionsReport(user.id, from, to);
    csv = toCsv(
      ["תאריך", "שעה", "מטופל/ת", "סוג", "סטטוס", "מחיר"],
      rows.map((r) => [
        formatDate(r.date),
        r.startTime,
        `${r.firstName} ${r.lastName}`,
        label(APPOINTMENT_TYPES, r.type),
        label(APPOINTMENT_STATUSES, r.status),
        r.price,
      ])
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tipulog-${type}-${from}-${to}.csv"`,
    },
  });
}
