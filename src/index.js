export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(env) });
    }

    try {
      const data = await request.json();
      const { formType, fullName, email, phone, message, reason, amount, city, areaOfInterest, availability, skills, motivation } = data;

      // Basic server-side validation
      if (!fullName || !email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
        });
      }

      const subjectMap = {
        contact: `New Contact Form Submission — ${fullName}`,
        donate: `New Donation Pledge — ₹${amount} from ${fullName}`,
        volunteer: `New Volunteer Application — ${fullName}`,
      };

      const bodyHtml = `
        <h2>${subjectMap[formType] || 'New Form Submission'}</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || '')}</p>
        ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
        ${amount ? `<p><strong>Amount:</strong> ₹${escapeHtml(amount)}</p>` : ''}
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
          from: 'Raham Foundation Website <forms@yourdomain.org>',
          to: ['hello@rahamfoundation.org'],
          reply_to: email,
          subject: subjectMap[formType] || 'New Form Submission',
          html: bodyHtml,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.text();
        return new Response(JSON.stringify({ error: 'Email send failed', detail: err }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }
  },
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}