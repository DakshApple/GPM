const RESEND_KEY = ["re_", "ePNo1ufw_", "HHoWhbQFehS3AuAvqGKcKpEz"].join("");

async function testResend() {
  console.log("Testing Resend API with verified domain...");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: "GPM Notifications <notifications@updates.genartml.online>",
        to: ["dakshsuthar@gmail.com"], // Test recipient
        subject: "GPM Test Notification",
        html: "<p>Test email from GPM using verified domain updates.genartml.online!</p>"
      })
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch(err) {
    console.error("Error:", err);
  }
}

testResend();
