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

    const isBase64 = (productUrl || '').startsWith('data:image/');
    const promptAsset = isBase64 
      ? 'A uploaded product photo asset.'
      : `The product link or image URL: ${productUrl}.`;

    const prompt = `You are the Lead Creative Strategy Agent for AgentArt AI.
Analyze this product asset: ${promptAsset}

Identify the specific product object, material, color, and unique design features (e.g., golden gorilla lamp, luxury decor, metallic finish, statement art).

Generate 3 high-converting, highly specific ad hooks for digital marketing tailored DIRECTLY to this exact product.

Return ONLY a raw JSON object with this exact structure (no markdown formatting, no codeblocks):
{
  "brandStyle": "Specific description of product visual identity",
  "palette": ["#Hex1", "#Hex2", "#Hex3"],
  "hooks": [
    "Hook 1 focusing on specific product features and aesthetic impact",
    "Hook 2 targeting luxury lifestyle appeal and interior design placement",
    "Hook 3 emphasizing bold statement piece value proposition"
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
        images: {
          heroShot: productUrl,
          lifestyleStory: productUrl
        }
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
