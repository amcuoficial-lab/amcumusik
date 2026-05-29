export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { djId, djEmail, djNombre, trackId, subject } = req.body;

  const GMAIL_USER = 'amcuoficial@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_PASS) return res.status(500).json({ error: 'GMAIL_APP_PASSWORD no configurado' });

  const promoLink = `https://amcustore.vercel.app/promo.html?t=${trackId}&d=${djId}`;

  const html = `
    <div style="background:#020202;color:#ede9e4;font-family:sans-serif;max-width:550px;margin:auto;padding:40px;text-align:center;border:1px solid #1a1a1a;">
      <h1 style="font-family:serif;font-size:32px;letter-spacing:4px;margin-bottom:8px;text-transform:uppercase;">AMCU</h1>
      <p style="color:#666;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:40px;">// Private Promo Delivery</p>
      
      <div style="width:180px;height:180px;background:#111;margin:0 auto 30px;border:1px solid #222;overflow:hidden;">
        <img src="https://amcustore.vercel.app/amcu-logo.PNG" style="width:100%;height:100%;object-fit:cover;">
      </div>

      <h2 style="font-size:24px;margin-bottom:12px;font-weight:400;">Hola ${djNombre || 'DJ'},</h2>
      <p style="color:#ccc;line-height:1.6;font-size:15px;margin-bottom:32px;">
        Te estamos enviando un nuevo promo exclusivo antes de su lanzamiento oficial.<br>
        Tu feedback es fundamental para nosotros.
      </p>

      <a href="${promoLink}" style="display:inline-block;background:#e01a10;color:#fff;text-decoration:none;padding:16px 32px;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">
        Escuchar y Descargar
      </a>

      <p style="color:#555;font-size:12px;margin-top:40px;">
        Este es un link privado para uso exclusivo del destinatario.<br>
        AMCU Record Label & Production Studio.
      </p>
      
      <hr style="border:none;border-top:1px solid #1a1a1a;margin:32px 0;">
      <p style="color:#333;font-size:10px;letter-spacing:2px;text-transform:uppercase;">amcuoficial@gmail.com</p>
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
      to: djEmail,
      subject: subject || 'NUEVO PROMO — AMCU',
      html
    });

    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Email send error:', e);
    return res.status(500).json({ error: e.message });
  }
}
