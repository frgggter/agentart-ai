'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface CampaignData {
  productCategory: string;
  environment: string;
  hooks: string[];
  contextHints: string[];
}

type DownloadKind = 'original' | 'studio';

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                              */
/* -------------------------------------------------------------------------- */

const BG = '#0A0D14';
const PANEL = '#111620';
const LINE = '#222B3B';
const GOLD = '#D9B77A';
const MUTED = '#8A94A8';
const SERIF =
  '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

// One light pool, used by the CSS render and by the optional baked download.
const POOL_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#f1e4c4'],
  [0.34, '#c9b78e'],
  [0.66, '#4a4130'],
  [1, BG],
];
const POOL_CSS = `radial-gradient(ellipse 62% 58% at 50% 46%, ${POOL_STOPS.map(
  ([stop, color]) => `${color} ${Math.round(stop * 100)}%`
).join(', ')})`;
const FADE_CSS =
  'linear-gradient(to top, rgba(10,13,20,0.92) 0%, rgba(10,13,20,0) 30%), ' +
  'radial-gradient(ellipse 85% 85% at 50% 46%, rgba(10,13,20,0) 55%, rgba(10,13,20,0.7) 100%)';

const STUDIO_IMAGE_STYLE: CSSProperties = {
  mixBlendMode: 'multiply',
  filter: 'contrast(1.12) saturate(1.15)',
};

const AGENTS: ReadonlyArray<{ name: string; job: string }> = [
  { name: 'Brand Agent', job: 'Reads the product and its brand cues' },
  { name: 'Strategy Agent', job: 'Chooses the angle and the audience' },
  { name: 'Generative Design Agent', job: 'Stages the studio set' },
  { name: 'Auditor Agent', job: 'Checks tone and unsupported claims' },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const STEP_INTERVAL_SECONDS = 1.2;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isDataUrl(value: string): boolean {
  return value.startsWith('data:image/');
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function toCampaignData(value: unknown): CampaignData | null {
  if (!value || typeof value !== 'object') return null;
  const { productCategory, environment, hooks, contextHints } = value as Record<string, unknown>;
  if (
    typeof productCategory !== 'string' ||
    typeof environment !== 'string' ||
    !Array.isArray(hooks)
  ) {
    return null;
  }
  const cleanHooks = hooks.filter((hook): hook is string => typeof hook === 'string');
  if (cleanHooks.length === 0) return null;
  return {
    productCategory,
    environment,
    hooks: cleanHooks,
    contextHints: Array.isArray(contextHints)
      ? contextHints.filter((hint): hint is string => typeof hint === 'string')
      : [],
  };
}

function safeBaseName(fileName: string, source: string): string {
  let raw = fileName;
  if (!raw && !isDataUrl(source)) {
    try {
      raw = new URL(source).pathname.split('/').pop() ?? '';
    } catch {
      raw = '';
    }
  }
  const withoutExt = raw.replace(/\.[a-z0-9]{2,5}$/i, '');
  const cleaned = withoutExt.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return cleaned || 'agentart-product';
}

function extensionFromMime(mime: string): string {
  const subtype = (mime.split('/')[1] ?? 'jpeg').split('+')[0].toLowerCase();
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

function triggerDownload(href: string, name: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, name);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path below.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The image could not be decoded.'));
    img.src = src;
  });
}

/**
 * Returns a same-origin source for the image. Uploads are already data URLs.
 * Remote images only work if the host sends CORS headers; otherwise this throws
 * and the caller falls back to opening the original in a new tab.
 */
async function toLocalSource(src: string): Promise<{ url: string; revoke: boolean }> {
  if (isDataUrl(src)) return { url: src, revoke: false };
  const response = await fetch(src, { mode: 'cors', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('The image host refused the request.');
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), revoke: true };
}

/**
 * Bakes the studio look into a PNG. This runs only when the person presses
 * Download, never while rendering, and only on same-origin pixels (uploads, or
 * remote images whose host allows CORS). The on-screen render is pure CSS.
 */
async function composeStudioImage(src: string): Promise<Blob> {
  const local = await toLocalSource(src);
  try {
    const img = await loadImage(local.url);
    const size = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser.');

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);

    // Light pool (same ellipse as the CSS version).
    ctx.save();
    ctx.translate(size * 0.5, size * 0.46);
    ctx.scale(0.62, 0.58);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    POOL_STOPS.forEach(([stop, color]) => pool.addColorStop(stop, color));
    ctx.fillStyle = pool;
    ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);
    ctx.restore();

    // Product, multiplied onto the light so the white box disappears.
    const box = size * 0.8;
    const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = 'contrast(1.12) saturate(1.15)';
    ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';

    // Floor fade and vignette.
    const floor = ctx.createLinearGradient(0, size, 0, size * 0.7);
    floor.addColorStop(0, 'rgba(10,13,20,0.92)');
    floor.addColorStop(1, 'rgba(10,13,20,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size * 0.5, size * 0.46);
    ctx.scale(0.85, 0.85);
    const vignette = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    vignette.addColorStop(0.55, 'rgba(10,13,20,0)');
    vignette.addColorStop(1, 'rgba(10,13,20,0.7)');
    ctx.fillStyle = vignette;
    ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not export the image.'))),
        'image/png'
      );
    });
  } finally {
    if (local.revoke) URL.revokeObjectURL(local.url);
  }
}

/* -------------------------------------------------------------------------- */
/*  Presentational pieces                                                      */
/* -------------------------------------------------------------------------- */

function OriginalFrame({ src, onError }: { src: string; onError: () => void }) {
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-xl"
      style={{ backgroundColor: '#F1F1EF' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Original product photo"
        referrerPolicy="no-referrer"
        decoding="async"
        onError={onError}
        className="absolute inset-0 h-full w-full object-contain p-[8%]"
      />
    </div>
  );
}

function StudioFrame({ src, onError }: { src: string; onError: () => void }) {
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-xl"
      style={{ isolation: 'isolate', backgroundColor: BG }}
    >
      <div aria-hidden="true" className="absolute inset-0" style={{ background: POOL_CSS }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Product staged in a dark advertising studio"
        referrerPolicy="no-referrer"
        decoding="async"
        onError={onError}
        className="absolute inset-0 h-full w-full object-contain p-[10%]"
        style={STUDIO_IMAGE_STYLE}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: FADE_CSS }}
      />
      <span
        className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: 'rgba(10,13,20,0.78)', color: GOLD, border: `1px solid ${GOLD}55` }}
      >
        AI Studio
      </span>
    </div>
  );
}

function BlockedFrame() {
  return (
    <div
      className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl p-6 text-center"
      style={{ backgroundColor: PANEL, border: `1px dashed ${LINE}` }}
    >
      <p className="text-sm font-medium text-slate-200">This image could not be loaded</p>
      <p className="max-w-xs text-sm" style={{ color: MUTED }}>
        The host may block hotlinking. Upload the file from your device instead.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const [productUrl, setProductUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [copied, setCopied] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [downloading, setDownloading] = useState<DownloadKind | null>(null);

  const startRef = useRef(0);
  const runningRef = useRef(false);

  // Live stopwatch and agent animation while the API call is in flight.
  useEffect(() => {
    if (!loading) return undefined;
    const id = window.setInterval(() => {
      if (!runningRef.current) return;
      const elapsed = (performance.now() - startRef.current) / 1000;
      setExecutionTime(elapsed);
      setActiveStep(Math.min(AGENTS.length - 1, Math.floor(elapsed / STEP_INTERVAL_SECONDS)));
    }, 100);
    return () => window.clearInterval(id);
  }, [loading]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (JPG, PNG or WebP).');
      input.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('That image is larger than 10 MB. Choose a smaller one.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setSelectedImage(reader.result);
      setFileName(file.name);
      setProductUrl('');
      setCampaignData(null);
      setExecutionTime(null);
      setActiveStep(-1);
      setImageFailed(false);
      setNotice(null);
      setError(null);
    };
    reader.onerror = () => setError('That file could not be read. Try another image.');
    reader.readAsDataURL(file);
    input.value = '';
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProductUrl(event.target.value);
    if (fileName) {
      // Typing a URL replaces any uploaded file.
      setSelectedImage(null);
      setFileName('');
      setCampaignData(null);
    }
  };

  const handleGenerate = async () => {
    if (loading) return;

    const source = fileName && selectedImage ? selectedImage : productUrl.trim();
    if (!source) {
      setError('Upload a product photo or paste an image URL first.');
      return;
    }
    if (!isDataUrl(source) && !isHttpUrl(source)) {
      setError('That URL is not valid. It should start with https://');
      return;
    }

    setError(null);
    setNotice(null);
    setCopied(false);
    setImageFailed(false);
    setCampaignData(null);
    setSelectedImage(source);
    setExecutionTime(0);
    setActiveStep(0);
    startRef.current = performance.now();
    runningRef.current = true;
    setLoading(true);

    try {
      // The model works from text clues, so an upload only sends its data-URL header
      // (keeps the request tiny and far below Vercel's 4.5 MB body limit).
      const payloadUrl = isDataUrl(source) ? source.slice(0, source.indexOf(',') + 1) : source;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productUrl: payloadUrl,
          fileName: fileName || undefined,
          productName: productName.trim() || undefined,
        }),
      });

      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : 'The campaign could not be generated.';
        throw new Error(message);
      }

      const data = toCampaignData(json);
      if (!data) throw new Error('The server returned an unexpected answer. Please try again.');

      runningRef.current = false;
      setExecutionTime((performance.now() - startRef.current) / 1000);
      setCampaignData(data);
      setActiveStep(AGENTS.length);
    } catch (caught) {
      runningRef.current = false;
      setActiveStep(-1);
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!campaignData) return;
    const ok = await copyText(campaignData.hooks.join('\n'));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setNotice('Copy is blocked by this browser. Select the hooks and copy them manually.');
    }
  };

  const handleDownload = async (kind: DownloadKind) => {
    if (!selectedImage || downloading) return;
    setDownloading(kind);
    setNotice(null);
    const base = safeBaseName(fileName, selectedImage);

    try {
      if (kind === 'studio') {
        saveBlob(await composeStudioImage(selectedImage), `${base}-studio.png`);
      } else if (isDataUrl(selectedImage)) {
        const mime = selectedImage.slice(5, selectedImage.indexOf(';'));
        triggerDownload(selectedImage, `${base}-original.${extensionFromMime(mime)}`);
      } else {
        const response = await fetch(selectedImage, { mode: 'cors', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error('The image host refused the request.');
        const blob = await response.blob();
        saveBlob(blob, `${base}-original.${extensionFromMime(blob.type || 'image/jpeg')}`);
      }
    } catch {
      window.open(selectedImage, '_blank', 'noopener,noreferrer');
      setNotice(
        kind === 'studio'
          ? 'The image host blocks direct downloads, so the studio render could not be saved as a file. Upload the image from your device to download the full render.'
          : 'The image host blocks direct downloads. The original opened in a new tab: use right-click, Save image as.'
      );
    } finally {
      setDownloading(null);
    }
  };

  const showOutput = selectedImage !== null && (loading || campaignData !== null);
  const timerLabel =
    executionTime === null ? null : `${executionTime.toFixed(2)} s`;

  const buttonBase =
    'rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9B77A] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <main className="min-h-screen text-slate-100" style={{ backgroundColor: BG }}>
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl"
              style={{ fontFamily: SERIF }}
            >
              AgentArt AI
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: MUTED }}>
              Drop in a product photo. Four agents read the brand, set the strategy, stage a
              studio shot and write the headlines.
            </p>
          </div>
          <p
            className="w-fit rounded-full px-3 py-1.5 text-xs"
            style={{ border: `1px solid ${LINE}`, color: MUTED }}
          >
            NVIDIA Nemotron 3.5 Lightning on Nebius
          </p>
        </header>

        {/* Inputs */}
        <section
          aria-label="Product input"
          className="grid gap-5 rounded-2xl p-5 md:grid-cols-2 md:p-6"
          style={{ backgroundColor: PANEL, border: `1px solid ${LINE}` }}
        >
          <label
            htmlFor="asset-upload"
            className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl p-5 text-center transition focus-within:ring-2 focus-within:ring-[#D9B77A] hover:border-[#D9B77A]"
            style={{ border: `1px dashed ${LINE}` }}
          >
            <input
              id="asset-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFile}
            />
            {fileName && selectedImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt=""
                  className="h-20 w-20 rounded-lg object-contain"
                  style={{ backgroundColor: '#F1F1EF' }}
                />
                <span className="max-w-full truncate text-sm font-medium text-slate-100">
                  {fileName}
                </span>
                <span className="text-xs" style={{ color: MUTED }}>
                  Click to choose a different photo
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-medium text-slate-100">Upload a product photo</span>
                <span className="text-sm" style={{ color: MUTED }}>
                  JPG, PNG or WebP, up to 10 MB
                </span>
              </>
            )}
          </label>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="image-url" className="mb-1.5 block text-sm text-slate-300">
                Or paste an image URL
              </label>
              <input
                id="image-url"
                type="url"
                inputMode="url"
                value={productUrl}
                onChange={handleUrlChange}
                placeholder="https://example.com/product.jpg"
                className="w-full rounded-xl bg-transparent px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9B77A]"
                style={{ border: `1px solid ${LINE}` }}
              />
            </div>

            <div>
              <label htmlFor="product-name" className="mb-1.5 block text-sm text-slate-300">
                Product name (optional)
              </label>
              <input
                id="product-name"
                type="text"
                maxLength={80}
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="e.g. Leather desk lamp"
                className="w-full rounded-xl bg-transparent px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9B77A]"
                style={{ border: `1px solid ${LINE}` }}
              />
              <p className="mt-1.5 text-xs" style={{ color: MUTED }}>
                The agents also read clues in the file name, such as lamp.jpg or puma-shoe.png.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="mt-auto rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70"
              style={{ backgroundColor: GOLD, color: BG }}
            >
              {loading ? 'Agents at work...' : 'Generate campaign'}
            </button>
          </div>
        </section>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: '#2A1519', border: '1px solid #5C2A33', color: '#F3B8C0' }}
          >
            {error}
          </p>
        ) : null}

        {/* Pipeline */}
        <section aria-label="Agent pipeline" className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-slate-300">Agent pipeline</h2>
            <p
              aria-live="polite"
              className="text-sm tabular-nums"
              style={{ color: loading ? GOLD : MUTED }}
            >
              {timerLabel === null
                ? 'Waiting for a product'
                : loading
                  ? `Running ${timerLabel}`
                  : `Completed in ${timerLabel}`}
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((agent, index) => {
              const done = activeStep > index;
              const active = activeStep === index && loading;
              return (
                <li
                  key={agent.name}
                  className="rounded-xl p-4 transition-colors"
                  style={{
                    backgroundColor: PANEL,
                    border: `1px solid ${active ? GOLD : LINE}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        active ? 'animate-pulse motion-reduce:animate-none' : ''
                      }`}
                      style={{ backgroundColor: done || active ? GOLD : LINE }}
                    />
                    <span className="text-sm font-medium text-slate-100">{agent.name}</span>
                    <span className="ml-auto text-xs" style={{ color: done ? GOLD : MUTED }}>
                      {done ? 'Done' : active ? 'Working' : 'Idle'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: MUTED }}>
                    {agent.job}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Output */}
        {showOutput && selectedImage ? (
          <section aria-label="Campaign output" className="mt-10">
            <div className="grid gap-6 md:grid-cols-2">
              <article
                className="rounded-2xl p-4"
                style={{ backgroundColor: PANEL, border: `1px solid ${LINE}` }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-slate-100">Original Asset Shot</h3>
                  <button
                    type="button"
                    onClick={() => void handleDownload('original')}
                    disabled={downloading !== null || imageFailed}
                    className={buttonBase}
                    style={{ border: `1px solid ${LINE}`, color: '#E2E8F0' }}
                  >
                    {downloading === 'original' ? 'Preparing...' : 'Download Image'}
                  </button>
                </div>
                {imageFailed ? (
                  <BlockedFrame />
                ) : (
                  <OriginalFrame src={selectedImage} onError={() => setImageFailed(true)} />
                )}
                <p className="mt-3 text-xs" style={{ color: MUTED }}>
                  The photo exactly as you provided it.
                </p>
              </article>

              <article
                className="rounded-2xl p-4"
                style={{ backgroundColor: PANEL, border: `1px solid ${LINE}` }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-slate-100">Studio Ad Visual</h3>
                  <button
                    type="button"
                    onClick={() => void handleDownload('studio')}
                    disabled={downloading !== null || imageFailed}
                    className={buttonBase}
                    style={{ backgroundColor: GOLD, color: BG }}
                  >
                    {downloading === 'studio' ? 'Preparing...' : 'Download Image'}
                  </button>
                </div>
                {imageFailed ? (
                  <BlockedFrame />
                ) : (
                  <StudioFrame src={selectedImage} onError={() => setImageFailed(true)} />
                )}
                <p className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                  {campaignData
                    ? `${campaignData.productCategory}. Scene: ${campaignData.environment}`
                    : 'Staging the set...'}
                </p>
              </article>
            </div>

            {notice ? (
              <p
                role="status"
                className="mt-4 rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: PANEL, border: `1px solid ${LINE}`, color: '#CBD5E1' }}
              >
                {notice}
              </p>
            ) : null}

            {/* Hooks */}
            <article
              className="mt-6 rounded-2xl p-5 md:p-6"
              style={{ backgroundColor: PANEL, border: `1px solid ${LINE}` }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-slate-100">Ad hooks</h3>
                  {campaignData?.contextHints.map((hint) => (
                    <span
                      key={hint}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                      style={{ border: `1px solid ${LINE}`, color: MUTED }}
                    >
                      {hint}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  disabled={!campaignData}
                  className={buttonBase}
                  style={{ border: `1px solid ${LINE}`, color: copied ? GOLD : '#E2E8F0' }}
                >
                  {copied ? 'Copied' : 'Copy Hooks'}
                </button>
              </div>

              {campaignData ? (
                <ul>
                  {campaignData.hooks.map((hook, index) => (
                    <li
                      key={`${index}-${hook}`}
                      className="py-4 text-xl leading-snug text-slate-50 sm:text-2xl"
                      style={{
                        fontFamily: SERIF,
                        borderTop: index === 0 ? 'none' : `1px solid ${LINE}`,
                      }}
                    >
                      {hook}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4" aria-hidden="true">
                  {[72, 58, 66].map((width) => (
                    <div
                      key={width}
                      className="h-6 animate-pulse rounded motion-reduce:animate-none"
                      style={{ width: `${width}%`, backgroundColor: LINE }}
                    />
                  ))}
                </div>
              )}
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
