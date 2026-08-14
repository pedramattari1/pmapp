import { Resend } from "resend";
import { env } from "./env.js";

// Resend is optional. Without RESEND_API_KEY the app runs fine — every send
// becomes a logged no-op, so Phase 3 verifies end to end without a key. Live
// delivery is verified later once the key is added.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export function isEmailEnabled(): boolean {
  return resend !== null;
}

export interface SendResult {
  sent: boolean;
  skipped: boolean;
  id?: string;
  error?: string;
}

async function send(
  to: string[],
  subject: string,
  html: string,
): Promise<SendResult> {
  const recipients = to.filter((addr) => addr && !addr.endsWith("@no-email.local"));
  if (recipients.length === 0) {
    console.log(`[email] no valid recipients for "${subject}" — skipped`);
    return { sent: false, skipped: true };
  }
  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY absent — would send "${subject}" to ${recipients.join(", ")} (skipped)`,
    );
    return { sent: false, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: env.MAIL_FROM,
      to: recipients,
      subject,
      html,
    });
    if (error) {
      console.error(`[email] send failed: ${error.message}`);
      return { sent: false, skipped: false, error: error.message };
    }
    return { sent: true, skipped: false, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error(`[email] send threw: ${message}`);
    return { sent: false, skipped: false, error: message };
  }
}

export interface WorkOrderEmailData {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: Date | null;
}

export function sendWorkOrderAssignedEmail(
  to: string,
  wo: WorkOrderEmailData,
  assignedByName: string,
): Promise<SendResult> {
  const due = wo.dueDate ? wo.dueDate.toISOString().slice(0, 10) : "—";
  const html = `
    <h2>Work order assigned to you</h2>
    <p><strong>${escapeHtml(wo.title)}</strong> (${wo.status})</p>
    <p>${escapeHtml(wo.description)}</p>
    <p>Due: ${due}</p>
    <p>Assigned by ${escapeHtml(assignedByName)}.</p>
  `;
  return send([to], `Work order assigned: ${wo.title}`, html);
}

export interface DigestData {
  overdue: { title: string; dueDate: string }[];
  openWorkOrders: { title: string; status: string }[];
}

export function sendOverdueDigestEmail(
  to: string[],
  data: DigestData,
): Promise<SendResult> {
  const overdue =
    data.overdue.length === 0
      ? "<li>None 🎉</li>"
      : data.overdue
          .map((t) => `<li>${escapeHtml(t.title)} — due ${t.dueDate}</li>`)
          .join("");
  const open =
    data.openWorkOrders.length === 0
      ? "<li>None</li>"
      : data.openWorkOrders
          .map((w) => `<li>${escapeHtml(w.title)} (${w.status})</li>`)
          .join("");
  const html = `
    <h2>The Fay — daily maintenance digest</h2>
    <h3>Overdue tasks (${data.overdue.length})</h3>
    <ul>${overdue}</ul>
    <h3>Open work orders (${data.openWorkOrders.length})</h3>
    <ul>${open}</ul>
  `;
  return send(to, "The Fay — daily maintenance digest", html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
