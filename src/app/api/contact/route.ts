import { NextResponse } from "next/server";
import { Resend } from "resend";

type ContactPayload = {
  email?: string;
  subject?: string;
  message?: string;
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

async function saveContactMessage(payload: Required<ContactPayload>) {
  const baseUrl =
    process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_POCKETBASE_URL;

  if (!baseUrl) {
    throw new Error("PocketBase URL is not configured.");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/collections/contact_messages/records`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        subject: payload.subject || null,
        message: payload.message,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`PocketBase contact save failed (${response.status})`);
  }
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

  const resendKey = process.env.RESEND_API_KEY ?? process.env.RESEND_API;
  const toEmail =
    process.env.CONTACT_TO_EMAIL ?? process.env.SUPPORT_EMAIL ?? "nightmareasian@gmail.com";
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? "GiveMeMIDI <onboarding@resend.dev>";

  if (!resendKey) {
    return NextResponse.json(
      { error: "Resend API key is not configured." },
      { status: 500 },
    );
  }

  try {
    await saveContactMessage({ email, subject, message });

    const safeSubject = subject || "New GiveMeMIDI contact message";
    const escapedMessage = escapeHtml(message).replace(/\n/g, "<br />");
    const resend = new Resend(resendKey);

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `GiveMeMIDI: ${safeSubject}`,
      text: `From: ${email}\nSubject: ${safeSubject}\n\n${message}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:28px">
          <div style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #263244;border-radius:18px;padding:24px">
            <p style="margin:0 0 8px;color:#67e8f9;font-size:12px;letter-spacing:.14em;text-transform:uppercase">GiveMeMIDI contact</p>
            <h1 style="margin:0 0 18px;color:#ffffff;font-size:22px">${escapeHtml(safeSubject)}</h1>
            <p style="margin:0 0 16px;color:#94a3b8">From <strong style="color:#ffffff">${escapeHtml(email)}</strong></p>
            <div style="line-height:1.7;color:#dbeafe">${escapedMessage}</div>
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Could not send your message right now." },
      { status: 500 },
    );
  }
}
