// Mailing Service using Web3Forms (or can be swapped with EmailJS/Resend)
// Note: Web3Forms sends emails to the owner of the access key.
// To send emails to clients, you need to enable 'Autoresponse' in Web3Forms dashboard,
// or switch to a transactional provider like EmailJS or Resend.

const WEB3FORMS_ACCESS_KEY = "17203923-0d98-420b-9da6-6389861baaf3"; // User provided key

const sendEmail = async (subject, message, clientEmail) => {
  console.log(`[MAIL SYSTEM] Sending email to: ${clientEmail} | Subject: ${subject}`);
  console.log(`[MAIL SYSTEM] Message: ${message}`);
  
  if (WEB3FORMS_ACCESS_KEY === "YOUR_WEB3FORMS_ACCESS_KEY") {
    console.warn("Web3Forms access key not set. Email logged to console only.");
    return;
  }

  try {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: subject,
        from_name: "GPM Mailer",
        email: clientEmail, // For Web3Forms Autoresponse
        message: message,
      })
    });
  } catch (err) {
    console.error("Failed to send email via Web3Forms", err);
  }
};

export const mail = {
  async sendTicketAcknowledgement(clientEmail, ticketId, ticketMessage, projectName) {
    const subject = `Request Received: ${ticketId} - ${projectName}`;
    const message = `Hello,\n\nWe have received your request for the project "${projectName}".\n\nRequest ID: ${ticketId}\nDetails: ${ticketMessage}\n\nOur team has been notified and will review it shortly.\n\nThank you,\nThe Team`;
    await sendEmail(subject, message, clientEmail);
  },

  async sendTicketResolved(clientEmail, ticketId, ticketMessage, projectName) {
    const subject = `Resolved: ${ticketId} - ${projectName}`;
    const message = `Hello,\n\nGreat news! Your request for the project "${projectName}" has been resolved.\n\nRequest ID: ${ticketId}\nDetails: ${ticketMessage}\n\nThank you for your patience.\n\nThe Team`;
    await sendEmail(subject, message, clientEmail);
  },

  async sendTeamNotification(ticketId, ticketMessage, projectName, priority, deadline) {
    const subject = `[NEW REQUEST] ${projectName} - ${ticketId}`;
    const message = `A new client request has been submitted for ${projectName}.\n\nPriority: ${priority}\nDeadline: ${deadline || 'None'}\n\nMessage:\n${ticketMessage}\n\nPlease review it in the admin dashboard.`;
    // We send this to the admin (owner of the Web3Forms key), so we can just pass a generic admin email
    await sendEmail(subject, message, "admin@gpm.local");
  },
  
  async sendWelcomeEmail(adminEmail, accountName) {
    const subject = `Welcome to GPM, ${accountName}!`;
    const message = `Your account has been successfully created.`;
    await sendEmail(subject, message, adminEmail);
  }
};
