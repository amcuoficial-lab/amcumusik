import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    const body = req.body;
    if (body.type !== 'payment') return res.status(200).end();

    const paymentId = body.data?.id;
    if (!paymentId) return res.status(200).end();

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    const orderId = payment.external_reference;
    const status  = payment.status;
    if (!orderId) return res.status(200).end();

    const sb = createClient(
      process.env.SUPABASE_URL,
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

      if (order?.products?.archivo_url) {
        await sb.from('orders').update({ archivo_entregado: true }).eq('id', orderId);
      }
    }

    return res.status(200).end();
  } catch (e) {
    console.error('webhook error:', e);
    return res.status(500).end();
  }
}
