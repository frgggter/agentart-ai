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

    const prompt = `You are the Lead Creative Strategy Agent for AgentArt AI.
Analyze this product asset URL: ${productUrl}.
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
      console.error('Nebius API error:', errText);
      throw new Error(`Nebius API error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content || '';

    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson);

    // If the input URL is a direct image (e.g. Puma Speedcat URL), reuse the original asset
    const isDirectImage = /\.(jpg|jpeg|png|webp|gif)/i.test(productUrl) || productUrl.includes('/image/upload/');
    
    const heroImage = isDirectImage 
      ? productUrl 
      : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80';

    const lifestyleImage = isDirectImage 
      ? productUrl 
      : 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80';

    return NextResponse.json({
      success: true,
      data: {
        ...parsedResult,
        images: {
          heroShot: heroImage,
          lifestyleStory: lifestyleImage
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
