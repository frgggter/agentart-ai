import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

/* -------------------------------------------------------------------------- */
/*  Config                                                                     */
/* -------------------------------------------------------------------------- */

const NEBIUS_BASE_URL = (
  process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1'
).replace(/\/+$/, '');
const NEBIUS_MODEL = process.env.NEBIUS_MODEL || 'nvidia/Nemotron-3_5-Lightning';

const ATTEMPT_TIMEOUT_MS = 20000;
const MAX_HTTP_URL_LENGTH = 4096;
const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,/i;

/* -------------------------------------------------------------------------- */
/*  Context hints                                                              */
/* -------------------------------------------------------------------------- */

interface ContextRule {
  id: string;
  keywords: string[];
  category: string;
  environment: string;
  angles: string;
}

const CONTEXT_RULES: ContextRule[] = [
  {
    id: 'automotive',
    keywords: [
      'coche', 'coches', 'car', 'cars', 'carro', 'vehicle', 'vehiculo', 'suv',
      'sedan', 'coupe', 'tesla', 'bmw', 'audi', 'porsche', 'ferrari', 'mercedes',
    ],
    category: 'Automotive / premium vehicle',
    environment:
      'Dark showroom with a wet reflective floor, rim lighting and a warm amber key light',
    angles: 'performance, status, the freedom of the open road',
  },
  {
    id: 'footwear',
    keywords: [
      'puma', 'nike', 'adidas', 'sneaker', 'sneakers', 'shoe', 'shoes', 'zapato',
      'zapatos', 'zapatilla', 'zapatillas', 'boot', 'boots', 'running', 'trainer',
    ],
    category: 'Sportswear & footwear',
    environment:
      'Matte-black studio plinth under a single warm spotlight with dust drifting in the beam',
    angles: 'speed, street credibility, the feeling of the first step',
  },
  {
    id: 'lighting',
    keywords: [
      'lamp', 'lamps', 'lampara', 'lamparas', 'luminaria', 'light', 'lighting',
      'bulb', 'luz',
    ],
    category: 'Home lighting & design',
    environment:
      'Dim lounge set where the product is the only light source, soft bokeh glow on a dark wall',
    angles: 'atmosphere, evenings at home, design that glows',
  },
  {
    id: 'watch',
    keywords: ['watch', 'watches', 'reloj', 'relojes', 'chronograph', 'timepiece'],
    category: 'Luxury watches',
    environment:
      'Black velvet surface with a thin beam of champagne light grazing the case',
    angles: 'craftsmanship, legacy, time worth keeping',
  },
  {
    id: 'fragrance',
    keywords: ['perfume', 'perfumes', 'fragrance', 'parfum', 'colonia', 'cologne'],
    category: 'Fragrance',
    environment:
      'Obsidian pedestal with floating mist and a golden backlight through the glass',
    angles: 'desire, memory, a signature you leave behind',
  },
  {
    id: 'audio',
    keywords: [
      'headphone', 'headphones', 'auricular', 'auriculares', 'earbuds', 'speaker',
      'altavoz', 'airpods',
    ],
    category: 'Audio & headphones',
    environment:
      'Dark acoustic studio with soft neon edge-light and a mirror-black floor',
    angles: 'immersion, silence on demand, sound without limits',
  },
  {
    id: 'electronics',
    keywords: [
      'phone', 'movil', 'iphone', 'smartphone', 'laptop', 'portatil', 'tablet',
      'camera', 'camara', 'console', 'consola',
    ],
    category: 'Consumer electronics',
    environment:
      'Minimal tech stage with a cool rim light and a subtle reflective glass surface',
    angles: 'power, simplicity, everyday upgrade',
  },
  {
    id: 'fashion',
    keywords: [
      'bag', 'bags', 'bolso', 'bolsos', 'mochila', 'backpack', 'handbag', 'wallet',
      'cartera', 'jacket', 'chaqueta', 'dress', 'vestido',
    ],
    category: 'Fashion & accessories',
    environment:
      'Dark editorial set with a single soft box overhead and a deep charcoal backdrop',
    angles: 'identity, craftsmanship, effortless style',
  },
  {
    id: 'beverage',
    keywords: [
      'coffee', 'cafe', 'espresso', 'bottle', 'botella', 'wine', 'vino', 'beer',
      'cerveza', 'whisky', 'drink', 'bebida',
    ],
    category: 'Food & beverage',
    environment:
      'Moody bar-top set with condensation on the surface and warm backlight through the liquid',
    angles: 'ritual, craving, the first sip',
  },
  {
    id: 'furniture',
    keywords: [
      'chair', 'silla', 'sofa', 'table', 'mesa', 'furniture', 'mueble', 'desk',
      'escritorio',
    ],
    category: 'Furniture & interiors',
    environment:
      'Dark gallery room with a pool of warm light on a polished concrete floor',
    angles: 'comfort, design, a room that finally feels finished',
  },
  {
    id: 'beauty',
    keywords: [
      'cream', 'crema', 'serum', 'skincare', 'cosmetic', 'makeup', 'maquillaje',
      'lipstick', 'labial',
    ],
    category: 'Beauty & skincare',
    environment:
      'Dark glossy surface with a soft golden glow and a few water droplets catching the light',
    angles: 'glow, ritual, confidence that shows',
  },
];

const DEFAULT_CATEGORY = 'Premium consumer product';
const DEFAULT_ENVIRONMENT =
  'Dark luxury studio with a single warm spotlight and a soft floor reflection';

interface ContextAnalysis {
  category: string;
  environment: string;
  angles: string;
  catalogId: string | null;
  matchedKeywords: string[];
  brief: string;
  hintsForClient: string[];
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function tokenize(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function collectSourceText(productUrl: string, fileName: string): string {
  const parts: string[] = [];
  if (fileName) parts.push(fileName);
  if (!DATA_URL_PATTERN.test(productUrl)) {
    try {
      const url = new URL(productUrl);
      parts.push(url.hostname, decodeURIComponent(url.pathname));
    } catch {
      parts.push(productUrl.slice(0, 300));
    }
  }
  return parts.join(' ');
}

function keywordMatches(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  return keyword.length >= 5 && token.startsWith(keyword);
}

function findMatches(tokens: string[]): Array<{ rule: ContextRule; keyword: string }> {
  const found: Array<{ rule: ContextRule; keyword: string }> = [];
  for (const rule of CONTEXT_RULES) {
    let hit: string | null = null;
    for (const token of tokens) {
      const keyword = rule.keywords.find((kw) => keywordMatches(token, kw));
      if (keyword) {
        hit = token;
        break;
      }
    }
    if (hit) found.push({ rule, keyword: hit });
  }
  return found;
}

function analyzeContext(
  productUrl: string,
  fileName: string,
  productName: string
): ContextAnalysis {
  const briefTokens = tokenize(productName);
  const sourceTokens = tokenize(collectSourceText(productUrl, fileName));

  // The user's own brief always wins over filename clues.
  const briefMatches = findMatches(briefTokens);
  const sourceMatches = findMatches(sourceTokens);
  const allMatches = [...briefMatches, ...sourceMatches];
  const primary = allMatches.length > 0 ? allMatches[0].rule : null;

  const catalogId = sourceTokens.find((token) => /^\d{5,}$/.test(token)) ?? null;

  const matchedKeywords = Array.from(new Set(allMatches.map((m) => m.keyword)));
  const hintsForClient: string[] = [];
  if (productName) hintsForClient.push(`Brief: ${productName.slice(0, 40)}`);
  matchedKeywords.slice(0, 3).forEach((kw) => hintsForClient.push(`Clue: ${kw}`));
  if (catalogId) hintsForClient.push(`Catalog ID: ${catalogId}`);

  return {
    category: primary ? primary.category : DEFAULT_CATEGORY,
    environment: primary ? primary.environment : DEFAULT_ENVIRONMENT,
    angles: primary ? primary.angles : 'desire, quality, a product worth wanting',
    catalogId,
    matchedKeywords,
    brief: productName,
    hintsForClient,
  };
}

/* -------------------------------------------------------------------------- */
/*  Prompt                                                                     */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT =
  'You are a senior advertising creative director and copywriter. ' +
  'You write finished, publish-ready ad headlines in English. ' +
  'Reply with a single JSON object and nothing else: no markdown, no code fences, no commentary.';

function buildUserPrompt(context: ContextAnalysis): string {
  const clueLines: string[] = [];
  if (context.brief) clueLines.push(`- Product brief from the user: "${context.brief}"`);
  if (context.matchedKeywords.length > 0) {
    clueLines.push(`- Keywords found in the file name or URL: ${context.matchedKeywords.join(', ')}`);
  }
  if (context.catalogId) {
    clueLines.push(
      `- A catalog ID (${context.catalogId}) was found. It carries no meaning beyond being a retail catalog image.`
    );
  }
  if (clueLines.length === 0) {
    clueLines.push('- No usable clues were found. Treat it as a premium physical product.');
  }

  return [
    'Create a product ad campaign.',
    '',
    'Context clues extracted from the asset (you cannot see the image itself):',
    ...clueLines,
    `- Likely category: ${context.category} (override it if the brief says otherwise)`,
    `- Suggested creative angles: ${context.angles}`,
    '',
    'Return exactly this JSON shape:',
    '{"productCategory": "<2-5 words>", "environment": "<one sentence, max 25 words, describing a luxury dark studio set for this product>", "hooks": ["<headline 1>", "<headline 2>", "<headline 3>"]}',
    '',
    'Rules for the hooks:',
    '- Exactly 3 headlines, each 3 to 9 words, ready to publish as they are.',
    '- Use a different angle in each: emotional, benefit-driven, status or desire.',
    '- Write direct, persuasive campaign lines, the kind you would see on a billboard.',
    '- Never describe a headline. Never write "Hook 1", "focusing on", "concept", brackets or placeholders.',
    '- Do not invent prices, discounts, statistics, awards or claims you cannot know.',
    '- No emojis, no hashtags, no quotation marks around the headlines.',
    '- If the product is unclear, write headlines that suit a premium physical product without naming a specific item.',
  ].join('\n');
}

/* -------------------------------------------------------------------------- */
/*  Model call + parsing                                                       */
/* -------------------------------------------------------------------------- */

type ModelResult =
  | { ok: true; content: string }
  | { ok: false; status: number; message: string; timedOut: boolean };

function readMessageContent(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const message = (choices[0] as { message?: { content?: unknown } } | null)?.message;
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === 'object') {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }
  return '';
}

async function callNemotron(apiKey: string, userPrompt: string): Promise<ModelResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const response = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NEBIUS_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      console.error(`[generate] Nebius responded ${response.status}: ${detail}`);
      return {
        ok: false,
        status: response.status,
        message: `The model provider answered with status ${response.status}.`,
        timedOut: false,
      };
    }

    const data: unknown = await response.json();
    return { ok: true, content: readMessageContent(data) };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    console.error('[generate] Nebius request failed:', error);
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      message: timedOut
        ? 'The model took too long to answer.'
        : 'Could not reach the model provider.',
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const META_PATTERN = /\b(hook\s*\d|focus(?:es|ing)?\s+on|concept|this headline|placeholder)\b/i;

function cleanHook(raw: string): string {
  return raw
    .trim()
    .replace(/^\s*(?:hook\s*\d+\s*[:.\-\u2013]\s*|\d+[.)]\s*|[-*\u2022]\s*)/i, '')
    .replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsableHook(hook: string): boolean {
  return hook.length >= 8 && hook.length <= 120 && !META_PATTERN.test(hook);
}

interface ParsedCampaign {
  productCategory: string;
  environment: string;
  hooks: string[];
}

function parseCampaign(raw: string, context: ContextAnalysis): ParsedCampaign | null {
  const withoutThinking = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const parsed = extractJsonObject(withoutThinking);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  const rawHooks: unknown[] = Array.isArray(obj.hooks) ? obj.hooks : [];
  const hooks = rawHooks
    .map((hook) => (typeof hook === 'string' ? cleanHook(hook) : ''))
    .filter(isUsableHook)
    .slice(0, 3);

  if (hooks.length < 2) return null;

  return {
    productCategory: sanitizeText(obj.productCategory, 60) || context.category,
    environment: sanitizeText(obj.environment, 220) || context.environment,
    hooks,
  };
}

/* -------------------------------------------------------------------------- */
/*  Route handler                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsedBody: unknown = await request.json();
    if (!parsedBody || typeof parsedBody !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    body = parsedBody as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const productUrl = typeof body.productUrl === 'string' ? body.productUrl.trim() : '';
  const fileName = sanitizeText(body.fileName, 120);
  const productName = sanitizeText(body.productName, 80);

  if (!productUrl) {
    return NextResponse.json({ error: 'productUrl is required.' }, { status: 400 });
  }

  // Base64 uploads are accepted but never forwarded: the model only receives text clues.
  if (!DATA_URL_PATTERN.test(productUrl)) {
    if (productUrl.length > MAX_HTTP_URL_LENGTH) {
      return NextResponse.json({ error: 'The image URL is too long.' }, { status: 400 });
    }
    try {
      const parsedUrl = new URL(productUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Only http(s) image URLs are supported.' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'The image URL is not valid.' }, { status: 400 });
    }
  }

  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEBIUS_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  const context = analyzeContext(productUrl, fileName, productName);
  const userPrompt = buildUserPrompt(context);

  let lastError = 'The model returned an unusable answer. Please try again.';
  let lastStatus = 502;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callNemotron(apiKey, userPrompt);

    if (!result.ok) {
      lastError = result.message;
      lastStatus = result.timedOut ? 504 : 502;
      // Retrying a timeout or a provider error would only burn the time budget.
      break;
    }

    const campaign = parseCampaign(result.content, context);
    if (campaign) {
      return NextResponse.json({
        productCategory: campaign.productCategory,
        environment: campaign.environment,
        hooks: campaign.hooks,
        contextHints: context.hintsForClient,
      });
    }
  }

  return NextResponse.json({ error: lastError }, { status: lastStatus });
}
