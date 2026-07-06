/**
 * Outbound WhatsApp sender. Uses the Twilio Messages API when credentials are
 * configured; otherwise runs in "simulated" mode so the feature is fully
 * usable and testable without an external account.
 *
 *   TWILIO_ACCOUNT_SID=ACxxxx
 *   TWILIO_AUTH_TOKEN=xxxx
 *   TWILIO_WHATSAPP_FROM=+14155238886   (the Twilio WhatsApp sender number)
 */

export type SendResult = {
  status: "sent" | "simulated" | "failed";
  detail: string | null;
};

/** "050-1234567" -> "whatsapp:+972501234567" */
export function toWhatsAppAddress(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  if (!/^0\d{8,9}$/.test(digits)) return null;
  return `whatsapp:+972${digits.slice(1)}`;
}

export function twilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
}

export async function sendWhatsAppMessage(
  phone: string,
  body: string
): Promise<SendResult> {
  const to = toWhatsAppAddress(phone);
  if (!to) return { status: "failed", detail: "מספר טלפון לא תקין" };

  if (!twilioConfigured()) {
    return {
      status: "simulated",
      detail: "Twilio לא מוגדר – ההודעה נרשמה אך לא נשלחה בפועל",
    };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
          To: to,
          Body: body,
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return { status: "failed", detail: `Twilio ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { sid?: string };
    return { status: "sent", detail: json.sid ?? null };
  } catch (e) {
    return { status: "failed", detail: String(e).slice(0, 200) };
  }
}
