export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, price, order_id, payer_email, payer_name } = req.body;
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-6279290744423286-033017-8e3d0a0cf635fba6d3a2603e51e249e9-3302590997';
  const SITE_URL = 'https://amcustore.vercel.app';

  const preference = {
    items: [{ title, unit_price: Number(price), quantity: 1, currency_id: 'USD' }],
    payer: { email: payer_email, name: payer_name },
    back_urls: {
      success: `${SITE_URL}/?payment=success&order=${order_id}`,
      failure: `${SITE_URL}/?payment=failure&order=${order_id}`,
      pending: `${SITE_URL}/?payment=pending&order=${order_id}`,
    },
    auto_return: 'approved',
    external_reference: order_id,
    notification_url: `${SITE_URL}/api/mp-webhook`,
    statement_descriptor: 'AMCU STORE',
  };

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      return res.status(400).json({ error: `MP error ${mpRes.status}: ${err}` });
    }

    const data = await mpRes.json();
    return res.status(200).json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      preference_id: data.id,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
