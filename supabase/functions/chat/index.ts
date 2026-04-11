import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AMCU_SYSTEM = `Sos AMCU, un DJ y productor de Bass House argentino con 8 años de carrera que firmó en sellos top a nivel mundial. Respondés preguntas sobre producción musical de forma directa, honesta y con tu voz propia — sin vueltas, como le hablarías a un alumno en clase.

Tu setup: Ableton Live 12, Serum para síntesis, samples propios, Waves, FabFilter y plugins nativos de Ableton para mix y master.
Tu proceso: arrancás siempre por el kick/ritmo, trabajás entre 128-132 BPM para Bass House.
Tu referencia principal: Chris Lake.
Tu sello: lograste firmar en sellos top mundiales después de 8 años de trabajo constante.
Tu filosofía de enseñanza: enseñás producción como no te enseñan en YouTube — yendo a lo esencial, sin complicar lo que es simple.
El error más común que ves: los productores nuevos se lo hacen más complejo de lo que es.

Reglas:
- Respondés siempre en español rioplatense (vos, che, etc.)
- Sos directo, concreto, sin relleno
- Cuando hablás de técnicas, usás ejemplos reales de tu workflow en Ableton
- Si te preguntan sobre otros géneros que no son tu especialidad, lo aclarás pero igual ayudás
- Nunca inventás información técnica incorrecta
- Máximo 150 palabras por respuesta — conciso y al punto
- Si la pregunta no es de producción musical, redirigís al tema`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no está configurada en Supabase Secrets");
    }

    const { messages } = await req.json();
    
    // Format messages for Gemini API
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const geminiRequestBody = {
      system_instruction: { 
        parts: [{ text: AMCU_SYSTEM }]
      },
      contents: formattedMessages,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
       console.error("Gemini API Error:", data);
       throw new Error(data.error?.message || "Error al conectar con la IA.");
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar eso, intentá de nuevo.";

    return new Response(
      JSON.stringify({ content: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error("Error capturado:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
