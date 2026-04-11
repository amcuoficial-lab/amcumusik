import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    const body = req.body;
    if (body.type !== 'payment') return res.status(200).end();

    const paymentId = body.data?.id;
    if (!paymentId) return res.status(200).end();

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-6279290744423286-033017-8e3d0a0cf635fba6d3a2603e51e249e9-3302590997';
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    const orderId = payment.external_reference;
    const status  = payment.status;
    if (!orderId) return res.status(200).end();

    const sb = createClient(
      process.env.SUPABASE_URL || 'https://anvkreqmsbzsfaepudlx.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const newEstado =
      status === 'approved' ? 'aprobado' :
      status === 'pending'  ? 'pendiente_pago' : 'rechazado';

    await sb.from('orders').update({
      estado: newEstado,
      mp_payment_id: String(paymentId),
      mp_status: status,
    }).eq('id', orderId);

    if (status === 'approved') {
      const { data: order } = await sb
        .from('orders')
        .select('*, products(*)')
        .eq('id', orderId)
        .single();

      if (order && order.products?.archivo_url) {
        // Generar URL firmada (válida 7 días)
        const filePath = order.products.archivo_url.split('/storage/v1/object/public/')[1] || order.products.archivo_url;
        const bucket = filePath.split('/')[0];
        const path   = filePath.split('/').slice(1).join('/');
        const { data: signed } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
        const downloadUrl = signed?.signedUrl || order.products.archivo_url;

        await sb.from('orders').update({ archivo_entregado: true }).eq('id', orderId);

        // Enviar email con el archivo
        const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
        if (GMAIL_PASS) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: 'amcuoficial@gmail.com', pass: GMAIL_PASS }
          });

          const html = `
            <div style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;">
              <h2 style="font-family:Georgia,serif;font-size:28px;letter-spacing:2px;margin-bottom:4px;">AMCU</h2>
              <p style="color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;">Bass House Producer</p>
              <hr style="border:none;border-top:1px solid #222;margin-bottom:24px;">
              <p style="color:#c0170f;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">✓ Compra Confirmada</p>
              <h3 style="font-size:22px;margin:0 0 16px;">Hola ${order.nombre},</h3>
              <p style="color:#ccc;line-height:1.6;">Tu compra de <strong style="color:#fff;">${order.products.nombre}</strong> fue aprobada.</p>
              <div style="margin:24px 0;">
                <a href="${downloadUrl}" style="display:inline-block;background:#c0170f;color:#fff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">
                  Descargar archivo
                </a>
              </div>
              <p style="color:#666;font-size:11px;line-height:1.6;">El link es válido por 7 días. Si tenés algún problema escribinos a <a href="mailto:amcuoficial@gmail.com" style="color:#c0170f;">amcuoficial@gmail.com</a></p>
              <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
              <p style="color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;">AMCU — amcuoficial@gmail.com</p>
            </div>
          `;

          await transporter.sendMail({
            from: '"AMCU" <amcuoficial@gmail.com>',
            to: order.email,
            subject: `Tu compra: ${order.products.nombre}`,
            html
          });
        }
      }
    }

    return res.status(200).end();
  } catch (e) {
    console.error('webhook error:', e);
    return res.status(500).end();
  }
}
