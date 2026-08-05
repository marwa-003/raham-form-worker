export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers });
    }

    try {
      const data = await request.json();
      const { formType, fullName, email, phone, message, reason, amount, city, areaOfInterest, availability, skills, motivation } = data;

      if (!fullName || !email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...headers },
        });
      }

      const subjectMap = {
        contact: `New Contact Form Submission — ${fullName}`,
        donate: `New Donation Pledge — Rs ${amount} from ${fullName}`,
        volunteer: `New Volunteer Application — ${fullName}`,
      };

      const bodyHtml = `
        <h2>${subjectMap[formType] || 'New Form Submission'}</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || '')}</p>
        ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
        ${amount ? `<p><strong>Amount:</strong> Rs${escapeHtml(amount)}</p>` : ''}
        ${city ? `<p><strong>City:</strong> ${escapeHtml(city)}</p>` : ''}
        ${areaOfInterest ? `<p><strong>Area of Interest:</strong> ${escapeHtml(areaOfInterest)}</p>` : ''}
        ${availability ? `<p><strong>Availability:</strong> ${escapeHtml(availability)}</p>` : ''}
        ${skills ? `<p><strong>Skills:</strong> ${escapeHtml(skills)}</p>` : ''}
        ${motivation ? `<p><strong>Motivation:</strong> ${escapeHtml(motivation)}</p>` : ''}
        ${message ? `<p><strong>Message:</strong><br/>${escapeHtml(message)}</p>` : ''}
      `;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Raham Foundation Website <onboarding@resend.dev>',
          to: ['marvaa.002@gmail.com'],
          reply_to: email,
          subject: subjectMap[formType] || 'New Form Submission',
          html: bodyHtml,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.text();
        return new Response(JSON.stringify({ error: 'Email send failed', detail: err }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...headers },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...headers },
      });
    }
  },
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}