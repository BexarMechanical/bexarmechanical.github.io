const MIN_FORM_AGE_MS = 3000;

function text(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function parseBody(req) {
  if (!req || typeof req.body === 'undefined' || req.body === null) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (typeof req.body === 'object') {
    return req.body;
  }

  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const body = parseBody(req);

  // Honeypot field: bots fill this, humans never should.
  const website = text(body.website, 200);
  if (website) {
    return res.status(200).json({ ok: true, message: 'Request received.' });
  }

  const submittedAt = Number(body.submittedAt || 0);
  if (!Number.isFinite(submittedAt) || Date.now() - submittedAt < MIN_FORM_AGE_MS) {
    return res.status(400).json({ ok: false, error: 'Please wait a moment and try again.' });
  }

  const fullName = text(body.fullName, 80);
  const company = text(body.company, 120);
  const phone = text(body.phone, 25);
  const email = text(body.email, 120);
  const serviceType = text(body.serviceType, 60);
  const urgency = text(body.urgency, 40);
  const address = text(body.address, 150);
  const city = text(body.city, 80);
  const preferredWindow = text(body.preferredWindow, 120);
  const message = text(body.message, 2000);
  const pageUrl = text(body.pageUrl, 300);
  const consent = body.consent === true || body.consent === 'true' || body.consent === 'on';

  if (!fullName || !phone || !email || !serviceType || !urgency || !address || !city || !message || !consent) {
    return res.status(400).json({ ok: false, error: 'Please complete all required fields.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const sendTo = process.env.SERVICE_REQUEST_TO;
  const sendFrom = process.env.SERVICE_REQUEST_FROM;

  if (!resendApiKey || !sendTo || !sendFrom) {
    console.error('Missing required env vars: RESEND_API_KEY, SERVICE_REQUEST_TO, SERVICE_REQUEST_FROM');
    return res.status(500).json({ ok: false, error: 'Form is temporarily unavailable. Please call us.' });
  }

  const subject = '[Service Request] ' + urgency + ' - ' + serviceType + ' - ' + city;
  const emailText = [
    'New service request from bexarmechanical.github.io',
    '',
    'Name: ' + fullName,
    'Company: ' + (company || 'N/A'),
    'Phone: ' + phone,
    'Email: ' + email,
    'Service Type: ' + serviceType,
    'Urgency: ' + urgency,
    'Address: ' + address,
    'City: ' + city,
    'Preferred Callback Window: ' + (preferredWindow || 'N/A'),
    '',
    'Issue Details:',
    message,
    '',
    'Submitted From: ' + (pageUrl || 'N/A')
  ].join('\n');

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sendFrom,
        to: [sendTo],
        reply_to: email,
        subject,
        text: emailText
      })
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error('Resend API error', resendData);
      return res.status(502).json({ ok: false, error: 'Unable to deliver email right now. Please call us.' });
    }

    return res.status(200).json({
      ok: true,
      message: 'Thanks. Your request was sent and we will contact you shortly.'
    });
  } catch (error) {
    console.error('Unexpected form submission error', error);
    return res.status(500).json({ ok: false, error: 'Unexpected error. Please call us directly.' });
  }
};
