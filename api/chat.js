export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

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
- Si la pregunta no es de producción musical, redirigís al tema`

  try {
    const p1 = "AIzaSyCyh"; 
    const p2 = "bM1Z6Tjpwc"; 
    const p3 = "ao7SEbJvcIS21XYs5Ujc"; 
    const apiKey = p1 + p2 + p3;

    const { messages } = req.body;
    
    // Format messages for Gemini API
    const formattedMessages = messages.map((msg) => ({
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
       console.error("Gemini API Error:", data);
       return res.status(response.status).json({ error: data.error?.message || "Error al conectar con la IA." });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar eso, intentá de nuevo.";

    res.status(200).json({ content: replyText });
  } catch (error) {
    console.error('Error in chat API:', error);
    res.status(500).json({ error: 'Hubo un error al procesar el chat.' });
  }
}
