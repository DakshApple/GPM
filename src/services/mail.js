// GPM Mailing Service using Resend (via Vercel Serverless Function)
// All admin notifications go to daksh@genartml.com

const ADMIN_EMAIL = "daksh@genartml.com";

const sendEmail = async (subject, htmlMessage, recipientEmail) => {
  console.log(`[MAIL] → ${recipientEmail} | ${subject}`);
  
  try {
    const res = await fetch("/api/sendEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: recipientEmail,
        subject: subject,
        html: htmlMessage,
      })
    });
    
    const data = await res.json();
    if (res.ok) {
      console.log(`[MAIL] ✅ Sent successfully via Resend API`);
    } else {
      console.error(`[MAIL] ❌ Failed:`, data);
    }
  } catch (err) {
    console.error("[MAIL] ❌ Network error:", err);
  }
};

export const mail = {
  // Client submits a ticket → notify admin
  async sendTicketAcknowledgement(clientEmail, ticketId, ticketMessage, projectName) {
    const subject = `Request Received: ${ticketId} - ${projectName}`;
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2>Request Received</h2>
        <p>Hello,</p>
        <p>We have successfully received your request for the project <strong>"${projectName}"</strong>.</p>
        <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Request ID:</strong> ${ticketId}</p>
          <p><strong>Details:</strong><br/>${ticketMessage}</p>
        </div>
        <p>Our team has been notified and will review it shortly. You can track this in your Client Portal.</p>
        <p>Thank you,<br/><strong>The GPM Team</strong></p>
      </div>
    `;
    await sendEmail(subject, html, clientEmail);
  },

  // Admin resolves a ticket → notify client
  async sendTicketResolved(clientEmail, ticketId, ticketMessage, projectName) {
    const subject = `Resolved: ${ticketId} - ${projectName}`;
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2>Request Resolved 🎉</h2>
        <p>Hello,</p>
        <p>Great news! Your request for the project <strong>"${projectName}"</strong> has been resolved by our team.</p>
        <div style="background: #e6fffa; padding: 16px; border-radius: 8px; border: 1px solid #b2f5ea; margin: 16px 0;">
          <p><strong>Request ID:</strong> ${ticketId}</p>
          <p><strong>Details:</strong><br/>${ticketMessage}</p>
        </div>
        <p>Thank you for your patience!</p>
        <p><strong>The GPM Team</strong></p>
      </div>
    `;
    await sendEmail(subject, html, clientEmail);
  },

  // Client submits a ticket → notify admin team at daksh@genartml.com
  async sendTeamNotification(ticketId, ticketMessage, projectName, priority, deadline) {
    const subject = `[NEW CLIENT REQUEST] ${projectName} - ${ticketId}`;
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #e53e3e;">🔔 New Client Request</h2>
        <p>A new ticket has been submitted by the client.</p>
        <table style="width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Project:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="background: #feebc8; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${priority.toUpperCase()}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Deadline:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${deadline || 'Not specified'}</td>
          </tr>
        </table>
        <div style="background: #f9f9f9; padding: 16px; border-left: 4px solid #cbd5e0; margin: 16px 0;">
          <strong>Message from Client:</strong><br/><br/>
          <em>"${ticketMessage}"</em>
        </div>
        <p>Please review and assign it in the GPM admin dashboard.</p>
      </div>
    `;
    await sendEmail(subject, html, ADMIN_EMAIL);
  },
  
  async sendWelcomeEmail(email, accountName) {
    const subject = `Welcome to GPM, ${accountName}!`;
    const html = `
      <div style="font-family: sans-serif; color: #333; text-align: center;">
        <h2>Welcome to GPM!</h2>
        <p>Hi ${accountName},</p>
        <p>Your GPM account has been successfully created by your administrator.</p>
        <p>You can now log in to the dashboard to see your assigned projects and tasks.</p>
      </div>
    `;
    await sendEmail(subject, html, email);
  },

  // Notify specific team member assigned to a project
  async sendProjectMemberNotification(memberEmail, subject, message) {
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h3>Project Update</h3>
        <p>${message}</p>
      </div>
    `;
    await sendEmail(subject, html, memberEmail);
  }
};
