export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Simple origin check (only allow requests from our frontend)
  const host = req.headers.host || '';
  // Vercel apps typically have vercel.app in their host, or localhost for testing
  // In production, we ensure it's not being curled without a host header
  if (!host.includes('localhost') && !host.includes('vercel.app') && !host.includes('genartml.com')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: missing RESEND_API_KEY' });
  }

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // For testing, Resend allows sending from onboarding@resend.dev to your verified email
        // Once you add a real domain in Resend (e.g. updates@yourdomain.com), change this!
        from: 'GPM Notifier <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, id: data.id });
    } else {
      console.error('Resend error:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to send email' });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
