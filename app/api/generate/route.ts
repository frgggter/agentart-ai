import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { productUrl } = await req.json();
    const apiKey = process.env.NEBIUS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NEBIUS_API_KEY no está configurada.' },
        { status: 500 }
      );
    }

    const prompt = `You are the Lead Creative Strategy Agent for AgentArt AI. 
Analyze this product link: ${productUrl}.
Generate 3 high-converting visual advertising hooks for a digital ad campaign.
Return ONLY a raw JSON object with this exact structure (no markdown formatting, no codeblocks):
{
  "brandStyle": "Brief description of brand visual identity",
  "palette": ["#Hex1", "#Hex2", "#Hex3"],
  "hooks": ["Hook 1 description", "Hook 2 description", "Hook 3 description"]
}`;

    const response = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'nvidia/Nemotron-3_5-Lightning',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error Nebius:', errText);
      throw new Error(`Error Nebius (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '';

    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson);

    // Añadimos imágenes dinámicas de campaña de alta resolución
    return NextResponse.json({
      success: true,
      data: {
        ...parsedResult,
        images: {
          heroShot: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          lifestyleStory: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
        }
      }
    });

  } catch (error: any) {
    console.error('Error en el flujo de agentes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la campaña con la IA' },
      { status: 500 }
    );
  }
}
