export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, email, fecha, hora, modalidad, mensaje } = req.body;

  const GMAIL_USER = 'amcuoficial@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_PASS) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD no configurado' });

  // Formatear fecha y hora
  const [anio, mes, dia] = fecha.split('-');
  const fechaFormateada = `${dia}/${mes}/${anio}`;
  const horaFormateada = `${String(hora).padStart(2,'0')}:00 hs`;

  const html = `
    <div style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #222;">
      <h2 style="font-family:Georgia,serif;font-size:24px;color:#e01a10;margin-bottom:4px;text-align:center;">AMCU</h2>
      <p style="color:#666;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;text-align:center;">// Nueva Solicitud de Clase</p>
      <hr style="border:none;border-top:1px solid #222;margin-bottom:24px;">
      <p>Se ha registrado una nueva solicitud de reserva desde la web:</p>
      <div style="background:#111;padding:20px;border-radius:4px;margin:20px 0;border:1px solid #222;">
        <p style="margin:8px 0;">👤 <strong>Alumno:</strong> ${nombre}</p>
        <p style="margin:8px 0;">✉️ <strong>Email:</strong> ${email}</p>
        <p style="margin:8px 0;">📅 <strong>Fecha:</strong> ${fechaFormateada}</p>
        <p style="margin:8px 0;">🕐 <strong>Horario:</strong> ${horaFormateada}</p>
        <p style="margin:8px 0;">📋 <strong>Modalidad:</strong> ${modalidad === 'presencial' ? 'Presencial' : 'Online'}</p>
        <p style="margin:8px 0;">💬 <strong>Mensaje:</strong> ${mensaje || '—'}</p>
      </div>
      <p style="font-size:12px;color:#555;text-align:center;margin-top:20px;">Puedes confirmarla o cancelarla desde el panel de administración.</p>
    </div>
  `;

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"AMCU Notificaciones" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      subject: `🚨 Nueva reserva de clase — ${nombre}`,
      html
    });

    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Notification send error:', e);
    return res.status(500).json({ error: e.message });
  }
}
