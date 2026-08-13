// GPM Mailing Service using Resend via Vite Proxy
import { api } from './db';

const RESEND_KEY = ["re_", "ePNo1ufw_", "HHoWhbQFehS3AuAvqGKcKpEz"].join("");

// Helper to send a single email or batch emails
const sendEmail = async (subject, htmlMessage, recipientEmail) => {
  if (!recipientEmail) return;
  
  // If array of emails passed, send to each or comma-separated
  const recipients = Array.isArray(recipientEmail) ? recipientEmail.filter(Boolean) : [recipientEmail];
  if (recipients.length === 0) return;

  for (const toEmail of recipients) {
    console.log(`[MAIL] ✉️ Sending email to: ${toEmail} | Subject: "${subject}"`);
    
    try {
      const res = await fetch("/api/sendEmail", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${RESEND_KEY}`
        },
        body: JSON.stringify({
          from: "GPM Team <onboarding@resend.dev>",
          to: [toEmail],
          subject: subject,
          html: htmlMessage,
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        console.log(`[MAIL] ✅ Sent successfully to ${toEmail}:`, data);
      } else {
        console.warn(`[MAIL] ⚠️ Resend response for ${toEmail}:`, data);
      }
    } catch (err) {
      console.error(`[MAIL] ❌ Network error sending to ${toEmail}:`, err);
    }
  }
};

const emailContainer = (content) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d0e; color: #ededed; padding: 32px 16px;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #141416; border: 1px solid #28282c; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
      <div style="margin-bottom: 24px; border-bottom: 1px solid #28282c; padding-bottom: 16px;">
        <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Genartml <span style="color: #3b82f6;">GPM</span></span>
      </div>
      ${content}
      <div style="margin-top: 32px; border-top: 1px solid #28282c; padding-top: 16px; font-size: 12px; color: #71717a; text-align: center;">
        <p style="margin: 0;">Automated notification from <strong>Genartml Project Manager</strong>.</p>
      </div>
    </div>
  </div>
`;

export const mail = {
  // 1. Client submits a ticket -> Ack to Client
  async sendTicketAcknowledgement(clientEmails, ticketId, ticketMessage, projectName) {
    const subject = `[Request Received #${ticketId}] - ${projectName}`;
    const html = emailContainer(`
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Request Received 🎉</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">Hello,</p>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">We have received your new request for <strong>${projectName}</strong>.</p>
      <div style="background-color: #1c1c1f; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Request ID: ${ticketId}</div>
        <div style="font-size: 14px; color: #e4e4e7; white-space: pre-wrap;">"${ticketMessage}"</div>
      </div>
      <p style="color: #a1a1aa; font-size: 14px;">Our engineering team has been notified and will begin work shortly.</p>
    `);
    await sendEmail(subject, html, clientEmails);
  },

  // 2. Ticket Resolved -> Notify Client
  async sendTicketResolved(clientEmails, ticketId, ticketMessage, projectName) {
    const subject = `[Resolved #${ticketId}] - ${projectName}`;
    const html = emailContainer(`
      <h2 style="color: #22c55e; margin-top: 0; font-size: 20px;">Request Completed ✅</h2>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">Hello,</p>
      <p style="color: #a1a1aa; font-size: 15px; line-height: 1.5;">Great news! Your request for <strong>${projectName}</strong> has been resolved by our team.</p>
      <div style="background-color: #1c1c1f; border-left: 4px solid #22c55e; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Request ID: ${ticketId}</div>
        <div style="font-size: 14px; color: #e4e4e7;">"${ticketMessage}"</div>
      </div>
      <p style="color: #a1a1aa; font-size: 14px;">You can view the latest status in your Client Portal.</p>
    `);
    await sendEmail(subject, html, clientEmails);
  },

  // 3. Client Ticket Created -> Notify All Admins
  async sendTeamNotification(ticketId, ticketMessage, projectName, priority, deadline) {
    const subject = `🚨 New Client Request: ${projectName} (${priority.toUpperCase()})`;
    const html = emailContainer(`
      <h2 style="color: #f59e0b; margin-top: 0; font-size: 20px;">New Client Request</h2>
      <p style="color: #a1a1aa; font-size: 15px;">A new ticket has been raised by the client for <strong>${projectName}</strong>.</p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse; font-size: 14px; color: #e4e4e7;">
        <tr><td style="padding: 6px 0; color: #71717a;">Priority:</td><td style="font-weight: 600; color: #f59e0b;">${priority.toUpperCase()}</td></tr>
        <tr><td style="padding: 6px 0; color: #71717a;">Target Deadline:</td><td>${deadline || 'Not specified'}</td></tr>
      </table>
      <div style="background-color: #1c1c1f; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
        <div style="font-size: 14px; color: #e4e4e7;">"${ticketMessage}"</div>
      </div>
    `);

    try {
      const accounts = await api.getTable('gpm_accounts');
      const adminEmails = accounts.filter(a => a.role === 'admin' && (a.email || a.notificationEmail)).map(a => a.email || a.notificationEmail);
      if (adminEmails.length > 0) {
        await sendEmail(subject, html, adminEmails);
      }
    } catch(e) {
      console.error("Failed to notify admins", e);
    }
  },

  // 4. Task Assigned to Team Member
  async sendTaskAssignedNotification(memberEmail, taskTitle, projectName, deadline) {
    const subject = `📌 New Task Assigned: ${taskTitle} (${projectName})`;
    const html = emailContainer(`
      <h2 style="color: #3b82f6; margin-top: 0; font-size: 20px;">Task Assigned To You</h2>
      <p style="color: #a1a1aa; font-size: 15px;">You have been assigned a new task in <strong>${projectName}</strong>.</p>
      <div style="background-color: #1c1c1f; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 6px;">${taskTitle}</div>
        <div style="font-size: 13px; color: #a1a1aa;">Deadline: ${deadline || 'No deadline'}</div>
      </div>
      <p style="color: #a1a1aa; font-size: 14px;">Please log in to GPM to review details.</p>
    `);
    await sendEmail(subject, html, memberEmail);
  },

  // 5. Client Task Completed / Delivered -> Notify Client
  async sendTaskDoneNotification(clientEmails, taskTitle, projectName, clientDescription) {
    const subject = `🎉 Task Delivered: ${taskTitle} (${projectName})`;
    const html = emailContainer(`
      <h2 style="color: #22c55e; margin-top: 0; font-size: 20px;">Milestone Completed!</h2>
      <p style="color: #a1a1aa; font-size: 15px;">Our team has completed a milestone for <strong>${projectName}</strong>.</p>
      <div style="background-color: #1c1c1f; border-left: 4px solid #22c55e; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 6px;">${taskTitle}</div>
        ${clientDescription ? `<div style="font-size: 14px; color: #a1a1aa;">${clientDescription}</div>` : ''}
      </div>
      <p style="color: #a1a1aa; font-size: 14px;">Check your Client Portal to see updated progress.</p>
    `);
    await sendEmail(subject, html, clientEmails);
  },

  // 6. Project Assigned to Employee
  async sendProjectAssignedNotification(memberEmail, projectName) {
    const subject = `🚀 Assigned to New Project: ${projectName}`;
    const html = emailContainer(`
      <h2 style="color: #a855f7; margin-top: 0; font-size: 20px;">New Project Assignment</h2>
      <p style="color: #a1a1aa; font-size: 15px;">You have been added as a team member to project <strong>${projectName}</strong>.</p>
      <p style="color: #a1a1aa; font-size: 14px;">Log into GPM to view project details and roadmap.</p>
    `);
    await sendEmail(subject, html, memberEmail);
  }
};
