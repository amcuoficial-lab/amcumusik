import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, price, order_id, payer_email, payer_name } = await req.json();

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN no configurado");

    // URL base del sitio (para success/failure redirect)
    const SITE_URL = Deno.env.get("SITE_URL") || "https://amcuoficial.vercel.app";

    const preference = {
      items: [
        {
          title: title,
          unit_price: Number(price),
          quantity: 1,
          currency_id: "USD",
        },
      ],
      payer: {
        email: payer_email,
        name: payer_name,
      },
      back_urls: {
        success: `${SITE_URL}/?payment=success&order=${order_id}`,
        failure: `${SITE_URL}/?payment=failure&order=${order_id}`,
        pending: `${SITE_URL}/?payment=pending&order=${order_id}`,
      },
      auto_return: "approved",
      external_reference: order_id,
      notification_url: `https://anvkreqmsbzsfaepudlx.supabase.co/functions/v1/rapid-endpoint`,
      statement_descriptor: "AMCU STORE",
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`MP API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        init_point: data.init_point,         // produccion
        sandbox_init_point: data.sandbox_init_point, // testing
        preference_id: data.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
