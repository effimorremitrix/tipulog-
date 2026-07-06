import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { handleIncomingWhatsApp, normalizePhone } from "@/lib/whatsapp/engine";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function twiml(message: string): NextResponse {
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(message)}</Message></Response>`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Twilio request signature validation (only enforced when a token is set). */
function validTwilioSignature(
  request: NextRequest,
  params: URLSearchParams
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true;
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const url = process.env.WHATSAPP_WEBHOOK_URL ?? request.url;
  const data =
    url +
    [...params.keys()]
      .sort()
      .map((k) => k + params.get(k))
      .join("");
  const expected = crypto
    .createHmac("sha1", token)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  return (
    signature.length > 0 &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

/** Resolve the clinic account for an incoming message by its WhatsApp number. */
async function resolveUserId(to: string): Promise<number | null> {
  const toNorm = normalizePhone(to);
  if (toNorm) {
    const rows = await db.select().from(settings);
    const match = rows.find(
      (s) => s.whatsappNumber && normalizePhone(s.whatsappNumber) === toNorm
    );
    if (match) return match.userId;
  }
  const allUsers = await db.select({ id: users.id }).from(users).limit(2);
  return allUsers.length === 1 ? allUsers[0].id : null;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);

  if (!validTwilioSignature(request, params)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.get("From") ?? "";
  const to = params.get("To") ?? "";
  const body = params.get("Body") ?? "";
  if (!from || !body) return twiml("הודעה ריקה התקבלה.");

  const userId = await resolveUserId(to);
  if (!userId) {
    return twiml("המספר אינו משויך לקליניקה. בדקו את הגדרות הוואטסאפ במערכת.");
  }

  const reply = await handleIncomingWhatsApp(userId, from, body);
  return twiml(reply);
}
