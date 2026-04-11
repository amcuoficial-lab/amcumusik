export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { to, nombre, fecha, hora, modalidad } = req.body;

  const GMAIL_USER = 'amcuoficial@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_PASS) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD no configurado' });

  // Formatear fecha y hora
  const [anio, mes, dia] = fecha.split('-');
  const fechaFormateada = `${dia}/${mes}/${anio}`;
  const horaFormateada = `${String(hora).padStart(2,'0')}:00 hs`;

  // Contenido según modalidad
  const esPresencial = modalidad === 'presencial';
  const ubicacion = esPresencial
    ? `<p style="margin:8px 0;">📍 <strong>Lavalle 774, CABA</strong></p>
       <p style="margin:8px 0;"><a href="https://maps.google.com/?q=Lavalle+774+Buenos+Aires" style="color:#c0170f;">Ver en Google Maps</a></p>`
    : `<p style="margin:8px 0;">🎥 La sesión es <strong>online</strong>. En horario de tu clase te llegará el link de Zoom a este email.</p>`;

  const html = `
    <div style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;">
      <h2 style="font-family:Georgia,serif;font-size:28px;letter-spacing:2px;margin-bottom:4px;">AMCU</h2>
      <p style="color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;">Producción Electrónica</p>
      <hr style="border:none;border-top:1px solid #222;margin-bottom:24px;">
      <p style="color:#c0170f;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">✓ Reserva Confirmada</p>
      <h3 style="font-size:22px;margin:0 0 20px;">Hola ${nombre},</h3>
      <p style="color:#ccc;line-height:1.6;">Tu sesión de producción ha sido <strong style="color:#fff;">confirmada</strong>.</p>
      <div style="background:#111;border:1px solid #222;padding:20px;margin:20px 0;border-radius:4px;">
        <p style="margin:8px 0;">📅 <strong>${fechaFormateada}</strong></p>
        <p style="margin:8px 0;">🕐 <strong>${horaFormateada}</strong></p>
        <p style="margin:8px 0;">📋 <strong>${esPresencial ? 'Presencial' : 'Online'}</strong></p>
        ${ubicacion}
      </div>
      <p style="color:#888;font-size:12px;margin-top:24px;">¿Tenés alguna consulta? Respondé este email o escribinos.</p>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
      <p style="color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;">AMCU — amcuoficial@gmail.com</p>
    </div>
  `;

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"AMCU" <${GMAIL_USER}>`,
      to,
      subject: `✓ Reserva confirmada — ${fechaFormateada} ${horaFormateada}`,
      html
    });

    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Email send error:', e);
    return res.status(500).json({ error: e.message });
  }
}
