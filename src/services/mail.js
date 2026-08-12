// GPM Mailing Service using Web3Forms
// All admin notifications go to daksh@genartml.com

const WEB3FORMS_ACCESS_KEY = "17203923-0d98-420b-9da6-6389861baaf3";
const ADMIN_EMAIL = "daksh@genartml.com";

const sendEmail = async (subject, message, replyToEmail) => {
  console.log(`[MAIL] → ${replyToEmail} | ${subject}`);
  
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: subject,
        from_name: "GPM Project Manager",
        email: replyToEmail,
        message: message,
      })
    });
    const data = await res.json();
    if (data.success) {
      console.log(`[MAIL] ✅ Sent successfully`);
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
    const message = `Hello,\n\nWe have received your request for the project "${projectName}".\n\nRequest ID: ${ticketId}\nDetails: ${ticketMessage}\n\nOur team has been notified and will review it shortly.\n\nThank you,\nThe GPM Team`;
    await sendEmail(subject, message, clientEmail);
  },

  // Admin resolves a ticket → notify client
  async sendTicketResolved(clientEmail, ticketId, ticketMessage, projectName) {
    const subject = `Resolved: ${ticketId} - ${projectName}`;
    const message = `Hello,\n\nGreat news! Your request for the project "${projectName}" has been resolved.\n\nRequest ID: ${ticketId}\nDetails: ${ticketMessage}\n\nThank you for your patience.\n\nThe GPM Team`;
    await sendEmail(subject, message, clientEmail);
  },

  // Client submits a ticket → notify admin team at daksh@genartml.com
  async sendTeamNotification(ticketId, ticketMessage, projectName, priority, deadline) {
    const subject = `[NEW CLIENT REQUEST] ${projectName} - ${ticketId}`;
    const message = `🔔 New Client Request\n\nProject: ${projectName}\nRequest ID: ${ticketId}\nPriority: ${priority}\nDeadline: ${deadline || 'Not specified'}\n\nClient Message:\n"${ticketMessage}"\n\nPlease review it in the GPM admin dashboard.`;
    await sendEmail(subject, message, ADMIN_EMAIL);
  },
  
  async sendWelcomeEmail(email, accountName) {
    const subject = `Welcome to GPM, ${accountName}!`;
    const message = `Your GPM account has been successfully created.\n\nYou can now log in to the dashboard.`;
    await sendEmail(subject, message, email);
  },

  // Notify specific team member assigned to a project
  async sendProjectMemberNotification(memberEmail, subject, message) {
    await sendEmail(subject, message, memberEmail);
  }
};
