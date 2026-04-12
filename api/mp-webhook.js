import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    // Verify MP webhook signature if secret is configured
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];
      const body = req.body;
      const paymentId = body?.data?.id;

      if (xSignature) {
        const parts = xSignature.split(',');
        let ts = '', v1 = '';
        for (const part of parts) {
          const [k, v] = part.split('=');
          if (k.trim() === 'ts') ts = v;
          if (k.trim() === 'v1') v1 = v;
        }
        const msg = `id:${paymentId};request-id:${xRequestId};ts:${ts}`;
        const expected = crypto.createHmac('sha256', webhookSecret).update(msg).digest('hex');
        if (expected !== v1) {
          console.error('MP webhook signature mismatch');
          return res.status(401).end();
        }
      }
    }

    const body = req.body;
    if (body.type !== 'payment') return res.status(200).end();

    const paymentId = body.data?.id;
    if (!paymentId) return res.status(200).end();

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN no configurado');
      return res.status(500).end();
    }

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

      if (order) {
        const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
        if (GMAIL_PASS) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: 'amcuoficial@gmail.com', pass: GMAIL_PASS }
          });

          const isSamplePack = order.products?.tipo === 'sample_pack';

          let html;
          if (isSamplePack && order.products?.archivo_url) {
            // Entrega automática via Dropbox solo para sample packs
            const downloadUrl = order.products.archivo_url;
            await sb.from('orders').update({ archivo_entregado: true }).eq('id', orderId);

            html = `
              <div style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;">
                <h2 style="font-family:Georgia,serif;font-size:28px;letter-spacing:2px;margin-bottom:4px;">AMCU</h2>
                <p style="color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;">Producción Electrónica</p>
                <hr style="border:none;border-top:1px solid #222;margin-bottom:24px;">
                <p style="color:#c0170f;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">✓ Compra Confirmada</p>
                <h3 style="font-size:22px;margin:0 0 16px;">Hola ${order.nombre},</h3>
                <p style="color:#ccc;line-height:1.6;">Tu compra de <strong style="color:#fff;">${order.products.nombre}</strong> fue aprobada.</p>
                <div style="margin:24px 0;">
                  <a href="${downloadUrl}" style="display:inline-block;background:#c0170f;color:#fff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">
                    Descargar Sample Pack
                  </a>
                </div>
                <p style="color:#666;font-size:11px;line-height:1.6;">Si tenés algún problema escribinos a <a href="mailto:amcuoficial@gmail.com" style="color:#c0170f;">amcuoficial@gmail.com</a></p>
                <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
                <p style="color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;">AMCU — amcuoficial@gmail.com</p>
              </div>
            `;
          } else {
            // Para tracks y otros: confirmación de compra, el archivo se envía manualmente
            html = `
              <div style="background:#0a0a0a;color:#fff;font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;">
                <h2 style="font-family:Georgia,serif;font-size:28px;letter-spacing:2px;margin-bottom:4px;">AMCU</h2>
                <p style="color:#888;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;">Producción Electrónica</p>
                <hr style="border:none;border-top:1px solid #222;margin-bottom:24px;">
                <p style="color:#c0170f;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">✓ Compra Confirmada</p>
                <h3 style="font-size:22px;margin:0 0 16px;">Hola ${order.nombre},</h3>
                <p style="color:#ccc;line-height:1.6;">Tu compra de <strong style="color:#fff;">${order.products.nombre}</strong> fue aprobada.</p>
                <div style="background:#111;border:1px solid #222;padding:20px;margin:20px 0;border-radius:4px;">
                  <p style="color:#ccc;font-size:13px;line-height:1.7;margin:0;">En las próximas horas te enviamos el archivo WAV a este email. Si tenés alguna consulta escribinos a <a href="mailto:amcuoficial@gmail.com" style="color:#c0170f;">amcuoficial@gmail.com</a></p>
                </div>
                <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
                <p style="color:#555;font-size:10px;letter-spacing:2px;text-transform:uppercase;">AMCU — amcuoficial@gmail.com</p>
              </div>
            `;
          }

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
