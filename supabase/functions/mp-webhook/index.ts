import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const body = await req.json();

    // Solo procesar notificaciones de pago
    if (body.type !== "payment") {
      return new Response("ok", { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return new Response("ok", { status: 200 });

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;

    // Obtener detalle del pago desde MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    const orderId = payment.external_reference;
    const status  = payment.status; // approved | pending | rejected

    if (!orderId) return new Response("ok", { status: 200 });

    // Actualizar orden en Supabase
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const newEstado =
      status === "approved" ? "aprobado" :
      status === "pending"  ? "pendiente_pago" : "rechazado";

    await sb.from("orders").update({
      estado: newEstado,
      mp_payment_id: String(paymentId),
      mp_status: status,
    }).eq("id", orderId);

    // Si el pago fue aprobado, enviar el archivo al comprador
    if (status === "approved") {
      const { data: order } = await sb
        .from("orders")
        .select("*, products(*)")
        .eq("id", orderId)
        .single();

      if (order?.products?.archivo_url) {
        // Aquí podrías enviar email con el link del archivo
        // Por ahora solo guardamos el estado
        await sb.from("orders").update({
          archivo_entregado: true
        }).eq("id", orderId);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response("error", { status: 500 });
  }
});
