import { Resend } from 'resend';

const resendKey = process.env.RESEND_API_KEY || '';
const fromEmail = process.env.FROM_EMAIL || '';
const notifyEmail = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || '';

export async function sendReservationEmail(
  subject: string,
  htmlBody: string,
  ics?: { filename: string; content: string }
) {
  if (!resendKey || !fromEmail || !notifyEmail) return { skipped: true };
  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: fromEmail,
    to: notifyEmail,
    subject,
    html: htmlBody,
    attachments: ics
      ? [{ filename: ics.filename, content: Buffer.from(ics.content), contentType: 'text/calendar' }]
      : undefined,
  });
  return { ok: true };
}
