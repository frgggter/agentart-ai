import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* -------------------------------------------------------------------------- */
/*  Config                                                                     */
/* -------------------------------------------------------------------------- */

const NEBIUS_BASE_URL = (
  process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1'
).replace(/\/+$/, '');
const NEBIUS_MODEL = process.env.NEBIUS_MODEL || 'nvidia/Nemotron-3_5-Lightning';

const CALL_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2;
const MAX_HTTP_URL_LENGTH = 4096;
const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,/i;

/* -------------------------------------------------------------------------- */
/*  Context hints (from file name, URL and the optional product brief)         */
/* -------------------------------------------------------------------------- */

interface ContextRule {
  id: string;
  keywords: string[];
  category: string;
  environment: string;
}

const CONTEXT_RULES: ContextRule[] = [
  {
    id: 'automotive',
    keywords: [
      'coche', 'coches', 'car', 'cars', 'carro', 'vehicle', 'vehiculo', 'suv',
      'sedan', 'coupe', 'tesla', 'bmw', 'audi', 'porsche', 'ferrari', 'mercedes',
      'volkswagen', 'golf', 'seat', 'toyota', 'ford',
    ],
    category: 'Automotive / premium vehicle',
    environment:
      'Dark showroom with a wet reflective floor, rim lighting and a warm amber key light',
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
  },
  {
    id: 'watch',
    keywords: ['watch', 'watches', 'reloj', 'relojes', 'chronograph', 'timepiece'],
    category: 'Luxury watches',
    environment: 'Black velvet surface with a thin beam of champagne light grazing the case',
  },
  {
    id: 'fragrance',
    keywords: ['perfume', 'perfumes', 'fragrance', 'parfum', 'colonia', 'cologne'],
    category: 'Fragrance',
    environment: 'Obsidian pedestal with floating mist and a golden backlight through the glass',
  },
  {
    id: 'audio',
    keywords: [
      'headphone', 'headphones', 'auricular', 'auriculares', 'earbuds', 'speaker',
      'altavoz', 'airpods',
    ],
    category: 'Audio & headphones',
    environment: 'Dark acoustic studio with soft neon edge-light and a mirror-black floor',
  },
  {
    id: 'electronics',
    keywords: [
      'phone', 'movil', 'iphone', 'smartphone', 'laptop', 'portatil', 'tablet',
      'camera', 'camara', 'console', 'consola',
    ],
    category: 'Consumer electronics',
    environment: 'Minimal tech stage with a cool rim light and a subtle reflective glass surface',
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
  },
  {
    id: 'furniture',
    keywords: [
      'chair', 'silla', 'sofa', 'table', 'mesa', 'furniture', 'mueble', 'desk',
      'escritorio',
    ],
    category: 'Furniture & interiors',
    environment: 'Dark gallery room with a pool of warm light on a polished concrete floor',
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
  },
];

const DEFAULT_CATEGORY = 'Premium consumer product';
const DEFAULT_ENVIRONMENT =
  'Dark luxury studio with a single warm spotlight and a soft floor reflection';

interface ContextAnalysis {
  category: string;
  environment: string;
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

function findMatches(tokens: string[]): Array<{ rule: ContextRule; matched: string }> {
  const found: Array<{ rule: ContextRule; matched: string }> = [];
  for (const rule of CONTEXT_RULES) {
    const token = tokens.find((candidate) =>
      rule.keywords.some((keyword) => keywordMatches(candidate, keyword))
    );
    if (token) found.push({ rule, matched: token });
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
  const allMatches = [...findMatches(briefTokens), ...findMatches(sourceTokens)];
  const primary = allMatches.length > 0 ? allMatches[0].rule : null;
  const catalogId = sourceTokens.find((token) => /^\d{5,}$/.test(token)) ?? null;
  const matchedKeywords = Array.from(new Set(allMatches.map((m) => m.matched)));

  const hintsForClient: string[] = [];
  if (productName) hintsForClient.push(`Brief: ${productName.slice(0, 40)}`);
  matchedKeywords.slice(0, 3).forEach((kw) => hintsForClient.push(`Clue: ${kw}`));
  if (catalogId) hintsForClient.push(`Catalog ID: ${catalogId}`);

  return {
    category: primary ? primary.category : DEFAULT_CATEGORY,
    environment: primary ? primary.environment : DEFAULT_ENVIRONMENT,
    catalogId,
    matchedKeywords,
    brief: productName,
    hintsForClient,
  };
}

function buildClueBlock(context: ContextAnalysis): string {
  const lines: string[] = [];
  if (context.brief) lines.push(`- Product brief from the user: "${context.brief}"`);
  if (context.matchedKeywords.length > 0) {
    lines.push(`- Keywords found in the file name or URL: ${context.matchedKeywords.join(', ')}`);
  }
  if (context.catalogId) {
    lines.push(
      `- A catalog ID (${context.catalogId}) was found. It carries no meaning beyond being a retail catalog image.`
    );
  }
  lines.push(`- Likely category: ${context.category} (override it if the brief says otherwise)`);
  if (lines.length === 1) {
    lines.unshift('- No other clues were found. Treat it as a premium physical product.');
  }
  return ['Clues about the product (you cannot see the image itself):', ...lines].join('\n');
}

/* -------------------------------------------------------------------------- */
/*  Model call + parsing helpers                                               */
/* -------------------------------------------------------------------------- */

type ModelResult =
  | { ok: true; content: string }
  | { ok: false; status: number; message: string };

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

async function callNemotron(
  apiKey: string,
  system: string,
  user: string,
  temperature: number
): Promise<ModelResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

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
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: 900,
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
      message: timedOut ? 'The model took too long to answer.' : 'Could not reach the model provider.',
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

// Anything that looks like a template placeholder or a description of a headline is rejected.
function looksLikePlaceholder(value: string): boolean {
  return (
    /[<>{}]/.test(value) ||
    /\b(headline|hook)\s*\d\b/i.test(value) ||
    /^(headline|hook|string|text|example|tbd|n\/a)\b/i.test(value.trim())
  );
}

const META_PATTERN = /\b(focus(?:es|ing)?\s+on|concept|this headline|placeholder)\b/i;

function cleanString(value: unknown, maxLength: number, minLength = 3): string {
  const text = sanitizeText(value, maxLength);
  if (text.length < minLength || looksLikePlaceholder(text)) return '';
  return text;
}

function readStrings(value: unknown, min: number, max: number, maxLength: number): string[] | null {
  if (!Array.isArray(value)) return min === 0 ? [] : null;
  const items = value
    .map((item) => cleanString(item, maxLength))
    .filter((item) => item.length > 0)
    .slice(0, max);
  return items.length >= min ? items : null;
}

function cleanHook(raw: string): string {
  return raw
    .trim()
    .replace(/^\s*(?:hook\s*\d+\s*[:.\-\u2013]\s*|\d+[.)]\s*|[-*\u2022]\s*)/i, '')
    .replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readHooks(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const hooks: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const hook = cleanHook(item);
    const wordCount = hook.split(/\s+/).length;
    if (
      hook.length >= 8 &&
      hook.length <= 120 &&
      wordCount <= 14 &&
      !looksLikePlaceholder(hook) &&
      !META_PATTERN.test(hook) &&
      !hooks.includes(hook)
    ) {
      hooks.push(hook);
    }
  }
  return hooks.length >= 3 ? hooks.slice(0, 3) : null;
}

/* -------------------------------------------------------------------------- */
/*  Agents                                                                     */
/* -------------------------------------------------------------------------- */

type AgentId = 'brand' | 'strategy' | 'design' | 'auditor';

interface BrandProfile {
  productCategory: string;
  audience: string;
  tone: string[];
  positioning: string;
}
interface StrategyPlan {
  bigIdea: string;
  hooks: string[];
}
interface DesignBrief {
  environment: string;
  palette: string[];
}
type Verdict = 'approved' | 'revised' | 'skipped';
interface AuditReport {
  hooks: string[];
  verdict: Verdict;
  notes: string[];
}

type AgentRun<T> =
  | { ok: true; value: T; ms: number }
  | { ok: false; status: number; message: string };

async function runAgent<T>(
  apiKey: string,
  system: string,
  user: string,
  validate: (raw: Record<string, unknown>) => T | null
): Promise<AgentRun<T>> {
  const started = Date.now();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await callNemotron(apiKey, system, user, attempt === 0 ? 0.7 : 0.3);
    if (!result.ok) return { ok: false, status: result.status, message: result.message };

    const withoutThinking = result.content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const parsed = extractJsonObject(withoutThinking);
    if (parsed && typeof parsed === 'object') {
      const value = validate(parsed as Record<string, unknown>);
      if (value !== null) return { ok: true, value, ms: Date.now() - started };
    }
    console.error('[generate] An agent returned an unusable answer, attempt', attempt + 1);
  }
  return { ok: false, status: 502, message: 'An agent returned an unusable answer. Please try again.' };
}

const HOOK_RULES = [
  'Hook rules:',
  '- Each headline is 3 to 9 words and ready to publish as it is.',
  '- Each one uses a different angle: emotional, benefit-driven, status or desire.',
  '- Direct, persuasive campaign lines, the kind you would see on a billboard.',
  '- Never describe a headline and never write "Hook 1" or "headline 1".',
  '- No invented prices, discounts, statistics, awards or rankings. No emojis, hashtags or quotation marks.',
].join('\n');

const JSON_ONLY = ' Reply with a single JSON object and nothing else: no markdown, no commentary.';

function brandPrompt(context: ContextAnalysis): { system: string; user: string } {
  return {
    system:
      'You are the Brand Agent in an advertising pipeline. You read the clues about a product and define who it is for and how it should sound.' +
      JSON_ONLY,
    user: [
      buildClueBlock(context),
      '',
      'Return a JSON object with these keys: productCategory (2 to 5 words), audience (who buys it, max 12 words), tone (array of 3 adjectives), positioning (one sentence, max 20 words).',
      'Do not invent facts about the product that the clues do not support.',
      '',
      'Format example for a different product. Never reuse its words:',
      '{"productCategory":"Hand coffee grinder","audience":"Home brewers who care about the ritual","tone":["warm","precise","unhurried"],"positioning":"A tactile grinder that turns the morning into a small ceremony."}',
    ].join('\n'),
  };
}

function validateBrand(raw: Record<string, unknown>): BrandProfile | null {
  const productCategory = cleanString(raw.productCategory, 60);
  const audience = cleanString(raw.audience, 100);
  const positioning = cleanString(raw.positioning, 160);
  const tone = readStrings(raw.tone, 2, 4, 24);
  if (!productCategory || !audience || !positioning || !tone) return null;
  return { productCategory, audience, tone, positioning };
}

function strategyPrompt(context: ContextAnalysis, brand: BrandProfile): { system: string; user: string } {
  return {
    system:
      'You are the Strategy Agent in an advertising pipeline. You turn a brand profile into one big idea and the first draft of the ad headlines.' +
      JSON_ONLY,
    user: [
      buildClueBlock(context),
      '',
      `Brand profile: ${JSON.stringify(brand)}`,
      '',
      'Return a JSON object with these keys: bigIdea (one sentence, max 15 words) and hooks (array of exactly 3 headlines in English).',
      HOOK_RULES,
      '',
      'Format example for a different product. Never reuse its words:',
      '{"bigIdea":"Make the first grind of the day feel like an event.","hooks":["Make mornings worth waking up for.","Grind slower. Taste everything.","The ritual your coffee deserves."]}',
    ].join('\n'),
  };
}

function validateStrategy(raw: Record<string, unknown>): StrategyPlan | null {
  const bigIdea = cleanString(raw.bigIdea, 160);
  const hooks = readHooks(raw.hooks);
  if (!bigIdea || !hooks) return null;
  return { bigIdea, hooks };
}

function designPrompt(brand: BrandProfile, plan: StrategyPlan): { system: string; user: string } {
  return {
    system:
      'You are the Generative Design Agent in an advertising pipeline. You art-direct the studio set where the product will be photographed.' +
      JSON_ONLY,
    user: [
      `Brand profile: ${JSON.stringify(brand)}`,
      `Big idea: ${plan.bigIdea}`,
      '',
      'Return a JSON object with these keys: environment (one sentence, max 25 words, a luxury dark studio set for this product with lighting and surface details) and palette (array of 3 color names).',
      '',
      'Format example for a different product. Never reuse its words:',
      '{"environment":"Black slate counter under a narrow warm spotlight, steam curling through the beam, walnut tones fading into darkness.","palette":["charcoal","walnut","amber"]}',
    ].join('\n'),
  };
}

function validateDesign(raw: Record<string, unknown>): DesignBrief | null {
  const environment = cleanString(raw.environment, 240, 15);
  const palette = readStrings(raw.palette, 2, 4, 24);
  if (!environment || !palette) return null;
  return { environment, palette };
}

function auditorPrompt(
  context: ContextAnalysis,
  brand: BrandProfile,
  draft: string[]
): { system: string; user: string } {
  return {
    system:
      'You are the Auditor Agent in an advertising pipeline. You are a careful editor who checks draft headlines before they are published and fixes the ones that fail.' +
      JSON_ONLY,
    user: [
      buildClueBlock(context),
      '',
      `Brand profile: ${JSON.stringify(brand)}`,
      `Draft headlines: ${JSON.stringify(draft)}`,
      '',
      'Check every headline. It passes only if it reads as a finished headline (not a description), has 3 to 9 words, and makes no claim the clues cannot support: prices, discounts, statistics, awards, rankings such as "best" or "number one", performance numbers.',
      'Rewrite the headlines that fail and keep the ones that pass word for word.',
      'Return a JSON object with these keys: hooks (array of exactly 3 final headlines), verdict ("approved" if you changed nothing, otherwise "revised") and notes (array of up to 3 short strings, each naming one change you made; empty if approved).',
      '',
      'Format example for a different product. Never reuse its words:',
      '{"hooks":["Make mornings worth waking up for.","Grind slower. Taste everything.","The ritual your coffee deserves."],"verdict":"revised","notes":["Removed an unverifiable claim about speed from the second headline."]}',
    ].join('\n'),
  };
}

function validateAudit(raw: Record<string, unknown>, draft: string[]): AuditReport | null {
  const hooks = readHooks(raw.hooks);
  const notes = readStrings(raw.notes, 0, 3, 140);
  if (!hooks || !notes) return null;
  const changed = hooks.some((hook, index) => hook !== draft[index]);
  return { hooks, verdict: changed ? 'revised' : 'approved', notes: changed ? notes : [] };
}

/* -------------------------------------------------------------------------- */
/*  Pipeline (streamed as newline-delimited JSON)                              */
/* -------------------------------------------------------------------------- */

type Send = (event: Record<string, unknown>) => void;

async function runPipeline(apiKey: string, context: ContextAnalysis, send: Send): Promise<void> {
  const start = (agent: AgentId) => send({ type: 'start', agent });
  const done = (agent: AgentId, ms: number, summary: string) =>
    send({ type: 'done', agent, ms, summary });

  // 1. Brand Agent: who is this for and how should it sound?
  start('brand');
  const brandPrep = brandPrompt(context);
  const brand = await runAgent(apiKey, brandPrep.system, brandPrep.user, validateBrand);
  if (!brand.ok) {
    send({ type: 'error', message: brand.message });
    return;
  }
  done('brand', brand.ms, `${brand.value.tone.join(', ')}. For ${brand.value.audience}`);

  // 2. Strategy Agent: one big idea and the first draft of the headlines.
  start('strategy');
  const strategyPrep = strategyPrompt(context, brand.value);
  const strategy = await runAgent(apiKey, strategyPrep.system, strategyPrep.user, validateStrategy);
  if (!strategy.ok) {
    send({ type: 'error', message: strategy.message });
    return;
  }
  done('strategy', strategy.ms, strategy.value.bigIdea);

  // 3. Generative Design Agent: art direction for the studio set.
  start('design');
  const designPrep = designPrompt(brand.value, strategy.value);
  const design = await runAgent(apiKey, designPrep.system, designPrep.user, validateDesign);
  const environment = design.ok ? design.value.environment : context.environment;
  done(
    'design',
    design.ok ? design.ms : 0,
    design.ok ? `Palette: ${design.value.palette.join(', ')}` : 'Agent unavailable, default studio set used'
  );

  // 4. Auditor Agent: checks the draft and rewrites anything it cannot stand behind.
  start('auditor');
  const draft = strategy.value.hooks;
  const auditorPrep = auditorPrompt(context, brand.value, draft);
  const audit = await runAgent(apiKey, auditorPrep.system, auditorPrep.user, (raw) =>
    validateAudit(raw, draft)
  );
  const report: AuditReport = audit.ok
    ? audit.value
    : { hooks: draft, verdict: 'skipped', notes: ['The auditor was unavailable, so the draft was not reviewed.'] };
  done(
    'auditor',
    audit.ok ? audit.ms : 0,
    report.verdict === 'approved'
      ? 'Approved the draft without changes'
      : report.verdict === 'revised'
        ? `Revised the draft. ${report.notes[0] ?? ''}`.trim()
        : 'Skipped, draft kept unreviewed'
  );

  send({
    type: 'result',
    data: {
      productCategory: brand.value.productCategory,
      environment,
      hooks: report.hooks,
      contextHints: context.hintsForClient,
      audit: { verdict: report.verdict, notes: report.notes },
    },
  });
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

  // Base64 uploads are accepted but never forwarded: the agents only receive text clues.
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
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send: Send = (event) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await runPipeline(apiKey, context, send);
      } catch (error) {
        console.error('[generate] Pipeline crashed:', error);
        send({ type: 'error', message: 'The pipeline failed unexpectedly. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
