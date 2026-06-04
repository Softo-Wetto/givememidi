import { NextResponse } from "next/server";

type ContactPayload = {
  email?: string;
  subject?: string;
  message?: string;
};

type ContactMessage = {
  email: string;
  subject: string;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPocketBaseUrl() {
  return process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "";
}

async function getPocketBaseAdminToken(baseUrl: string) {
  const identity = process.env.POCKETBASE_SUPERUSER_EMAIL;
  const password = process.env.POCKETBASE_SUPERUSER_PASSWORD;

  if (!identity || !password) return null;

  const authBody = JSON.stringify({ identity, password });
  const endpoints = [
    "/api/collections/_superusers/auth-with-password",
    "/api/admins/auth-with-password",
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: authBody,
    });

    if (!response.ok) continue;
    const payload = (await response.json()) as { token?: string };
    if (payload.token) return payload.token;
  }

  return null;
}

async function saveContactMessage(payload: ContactMessage) {
  const baseUrl = getPocketBaseUrl().replace(/\/$/, "");
  if (!baseUrl) {
    return { ok: false, reason: "MESSAGE_STORE_URL_MISSING" };
  }

  const recordUrl = `${baseUrl}/api/collections/contact_messages/records`;
  const body = JSON.stringify({
    email: payload.email,
    subject: payload.subject || null,
    message: payload.message,
  });

  const publicResponse = await fetch(recordUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (publicResponse.ok) return { ok: true, reason: null };

  if (![401, 403].includes(publicResponse.status)) {
    return { ok: false, reason: `MESSAGE_STORE_SAVE_${publicResponse.status}` };
  }

  const token = await getPocketBaseAdminToken(baseUrl);
  if (!token) return { ok: false, reason: `MESSAGE_STORE_AUTH_${publicResponse.status}` };

  const adminResponse = await fetch(recordUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  return {
    ok: adminResponse.ok,
    reason: adminResponse.ok ? null : `MESSAGE_STORE_ADMIN_SAVE_${adminResponse.status}`,
  };
}

async function sendContactEmail(payload: ContactMessage) {
  const resendKey = process.env.RESEND_API_KEY ?? process.env.RESEND_API;
  const toEmail =
    process.env.CONTACT_TO_EMAIL ?? process.env.SUPPORT_EMAIL ?? "nightmareasian@gmail.com";
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL ?? "GiveMeMIDI <no-reply@givememidi.com>";

  if (!resendKey) {
    return { ok: false, reason: "EMAIL_KEY_MISSING" };
  }

  const safeSubject = payload.subject || "New GiveMeMIDI contact message";
  const escapedMessage = escapeHtml(payload.message).replace(/\n/g, "<br />");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: payload.email,
      subject: `GiveMeMIDI: ${safeSubject}`,
      text: `From: ${payload.email}\nSubject: ${safeSubject}\n\n${payload.message}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:28px">
          <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #263244;border-radius:18px;padding:24px">
            <p style="margin:0 0 8px;color:#67e8f9;font-size:12px;letter-spacing:.14em;text-transform:uppercase">GiveMeMIDI contact</p>
            <h1 style="margin:0 0 18px;color:#ffffff;font-size:22px">${escapeHtml(safeSubject)}</h1>
            <p style="margin:0 0 16px;color:#94a3b8">From <strong style="color:#ffffff">${escapeHtml(payload.email)}</strong></p>
            <div style="line-height:1.7;color:#dbeafe">${escapedMessage}</div>
          </div>
        </div>
      `,
    }),
  });

  if (response.ok) return { ok: true, reason: null };

  const text = await response.text().catch(() => "");
  console.error("Contact email send failed:", response.status, text);
  return { ok: false, reason: `EMAIL_DELIVERY_${response.status}` };
}

export async function POST(request: Request) {
  let body: ContactPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = clean(body.email, 320).toLowerCase();
  const subject = clean(body.subject, 140);
  const message = clean(body.message, 5000);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 });
  }

  const payload = { email, subject, message };

  const [emailResult, saveResult] = await Promise.all([
    sendContactEmail(payload),
    saveContactMessage(payload),
  ]);

  if (!saveResult.ok) {
    console.error("Contact message save failed:", saveResult.reason);
  }

  if (!emailResult.ok) {
    const message =
      emailResult.reason === "EMAIL_KEY_MISSING"
        ? "Email delivery is not configured on the server."
        : "Could not send your message right now.";

    return NextResponse.json(
      { error: message, code: emailResult.reason, saved: saveResult.ok },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, saved: saveResult.ok });
}
