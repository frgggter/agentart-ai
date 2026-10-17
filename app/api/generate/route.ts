import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { productUrl } = await req.json();
    const apiKey = process.env.NEBIUS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NEBIUS_API_KEY environment variable is not configured.' },
        { status: 500 }
      );
    }

    // Extraer pistas contextuales de la URL o nombre del archivo
    let contextHint = 'product asset';
    if (productUrl.includes('coche') || productUrl.includes('car')) {
      contextHint = 'automobile vehicle car luxury automotive';
    } else if (productUrl.includes('puma') || productUrl.includes('zapatillas') || productUrl.includes('shoe')) {
      contextHint = 'athletic sneakers footwear fashion streetwear';
    } else if (productUrl.includes('1003441') || productUrl.includes('lamp') || productUrl.includes('gold')) {
      contextHint = 'golden gorilla lamp luxury home decor statement piece interior lighting';
    }

    const prompt = `You are the Chief Creative Officer for AgentArt AI.
Contextual clues from asset analysis: "${contextHint}".
Source input: ${productUrl.slice(0, 150)}

Generate 3 READY-TO-PUBLISH, compelling, high-converting ad copy headlines (hooks) tailored explicitly to this product. Do NOT write meta-descriptions or instructions like "Hook 1...". Write the actual final ad text directly.

Also determine the best aesthetic environment: "luxury_lounge", "neon_cyberpunk", or "minimal_studio".

Return ONLY raw JSON with this exact structure (no markdown, no codeblocks):
{
  "productCategory": "Luxury Home Decor & Statement Lighting",
  "environment": "luxury_lounge",
  "hooks": [
    "Illuminate your space with bold, uninhibited luxury—where sculptural art meets functional design.",
    "Elevate your interior statement: Hand-crafted gold finish that turns every room into a modern gallery.",
    "Bespoke aesthetic impact. Redefine your home decor with an iconic conversation starter."
  ]
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Nebius API error:', errText);
      throw new Error(`Nebius API error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '';

    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      data: {
        ...parsedResult,
        heroShot: productUrl,
        lifestyleStory: productUrl
      }
    });

  } catch (error: any) {
    console.error('Workflow error:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing creative campaign with NVIDIA Nemotron' },
      { status: 500 }
    );
  }
}
