'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [productUrl, setProductUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [executionTime, setExecutionTime] = useState<string | null>(null);
  const [renderedAdUrl, setRenderedAdUrl] = useState<string | null>(null);

  const activeImage = selectedImage || productUrl || campaignData?.heroShot;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setProductUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Renderiza el escenario contextualizado cuando la IA devuelve los datos
  useEffect(() => {
    if (!campaignData || !activeImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImage;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Fondo de Escenario Contextualizado según la IA
      const env = campaignData.environment || 'luxury_lounge';
      let grad1 = '#1E1B4B', grad2 = '#0F172A', grad3 = '#020617';

      if (env === 'neon_cyberpunk') {
        grad1 = '#831843'; grad2 = '#4C0519'; grad3 = '#0F172A';
      } else if (env === 'luxury_lounge') {
        grad1 = '#451A03'; grad2 = '#1C1917'; grad3 = '#09090B';
      }

      const bg = ctx.createRadialGradient(500, 400, 100, 500, 500, 700);
      bg.addColorStop(0, grad1);
      bg.addColorStop(0.6, grad2);
      bg.addColorStop(1, grad3);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1000, 1000);

      // 2. Luz de Foco Posterior (Soft Spotlight)
      const spot = ctx.createRadialGradient(500, 400, 20, 500, 400, 350);
      spot.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      spot.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, 1000, 1000);

      // 3. Sombra de Pedestal en el Suelo
      ctx.beginPath();
      ctx.ellipse(500, 820, 280, 50, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fill();

      // 4. Dibujar Producto Escalado y Centrado
      const scale = Math.min(600 / img.width, 600 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (1000 - w) / 2;
      const y = 800 - h;
      ctx.drawImage(img, x, y, w, h);

      // 5. Marco & Banner de Campaña Publicitaria AI
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(50, 50, 220, 40);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText('AGENTART STUDIO', 70, 76);

      if (campaignData.productCategory) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(50, 910, 900, 50);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.fillText(`CAMPAIGN CATEGORY: ${campaignData.productCategory.toUpperCase()}`, 70, 940);
      }

      setRenderedAdUrl(canvas.toDataURL('image/png'));
    };
  }, [campaignData, activeImage]);

  const handleGenerate = async () => {
    const assetInput = selectedImage || productUrl;
    if (!assetInput) {
      alert('Please enter a product URL or upload an image file.');
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setCampaignData(null);
    setRenderedAdUrl(null);
    setExecutionTime(null);
    setActiveStep(1);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: assetInput }),
      });

      const json = await res.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (json.success && json.data) {
        setCampaignData(json.data);
        setExecutionTime(`${duration}s`);
      } else {
        alert(json.error || 'Failed to generate campaign assets.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to generation server.');
    } finally {
      clearInterval(stepInterval);
      setActiveStep(4);
      setLoading(false);
    }
  };

  const handleDownload = (dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handleCopy = () => {
    if (!campaignData?.hooks) return;
    const textToCopy = campaignData.hooks.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white p-8">
      <header className="flex justify-between items-center mb-10 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">AgentArt AI</h1>
          <p className="text-sm text-gray-400">Powered by NVIDIA Nemotron & Nebius Token Factory</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Nebius Engine Active
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-[#121722] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">Launch AI Campaign</h2>
            <p className="text-sm text-gray-400 mb-4">
              Upload a product photo or enter an image URL to activate the multi-agent creative pipeline.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
                Option 1: Upload Product Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer bg-[#0A0D14] p-2 rounded-lg border border-gray-800"
              />
            </div>

            {selectedImage && (
              <div className="mb-4 p-2 bg-[#0A0D14] rounded-lg border border-emerald-500/30 flex items-center gap-3">
                <img src={selectedImage} alt="Preview" className="w-12 h-12 object-cover rounded" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-emerald-400 font-medium">Image Loaded Ready</p>
                  <button onClick={() => setSelectedImage(null)} className="text-[10px] text-red-400 underline">
                    Remove file
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase">Or</span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">
                Option 2: Product Image URL
              </label>
              <input
                type="text"
                placeholder="https://images.puma.com/image/upload/.../Zapatillas-Speedcat-OG-unisex"
                value={productUrl}
                onChange={(e) => {
                  setProductUrl(e.target.value);
                  if (e.target.value) setSelectedImage(null);
                }}
                className="w-full p-3 rounded-lg bg-[#0A0D14] border border-gray-700 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-lg transition-all disabled:opacity-50 text-black mt-2"
            >
              {loading ? 'Executing Multi-Agent Pipeline...' : 'Generate Campaign →'}
            </button>
          </div>

          <div className="bg-[#121722] p-6 rounded-xl border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Autonomous Agent Workflow
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Brand & Vision Agent', desc: 'Analyzing product style, color palette & visual composition' },
                { name: 'Creative Strategy Agent', desc: 'Generating high-converting ad hooks with NVIDIA Nemotron 3.5' },
                { name: 'Generative Design Agent', desc: 'Rendering HD multi-format campaign visuals on Nebius' },
                { name: 'Brand Auditor Agent', desc: 'Validating brand consistency, guidelines & compliance' },
              ].map((agent, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-all ${
                    activeStep > i
                      ? 'border-emerald-500/50 bg-emerald-500/5 text-white'
                      : 'border-gray-800 bg-[#0A0D14] text-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeStep > i ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    <span className="font-medium text-sm">{agent.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 pl-4">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="bg-[#121722] p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Campaign Creative Output</h2>
              {executionTime && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/30 font-mono">
                  Completed in {executionTime}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Asset Shot */}
              <div className="bg-[#0A0D14] border border-gray-800 rounded-lg p-3 text-center flex flex-col justify-between items-center min-h-[260px]">
                <span className="text-xs text-gray-400 mb-1 block font-medium">Original Asset Shot</span>
                <div className="w-full h-40 flex items-center justify-center p-2 rounded-md my-auto bg-white/5">
                  {campaignData ? (
                    <img src={activeImage} alt="Hero Shot" className="max-h-full max-w-full object-contain rounded-md" />
                  ) : (
                    <p className="text-xs text-gray-600">[ Visual Generated via Nebius ]</p>
                  )}
                </div>
                {campaignData && (
                  <button
                    onClick={() => handleDownload(activeImage, 'hero-shot.png')}
                    className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-emerald-400 rounded border border-gray-700 mt-2 font-medium"
                  >
                    Download Image ↓
                  </button>
                )}
              </div>

              {/* Contextual Rendered Studio Visual */}
              <div className="bg-[#0A0D14] border border-gray-800 rounded-lg p-3 text-center flex flex-col justify-between items-center min-h-[260px]">
                <span className="text-xs text-gray-400 mb-1 block font-medium">Studio Ad Visual (AI Context)</span>
                <div className="w-full h-40 flex items-center justify-center rounded-md my-auto relative overflow-hidden p-1">
                  {renderedAdUrl ? (
                    <img src={renderedAdUrl} alt="Contextual Ad Visual" className="max-h-full max-w-full object-contain rounded-md shadow-2xl" />
                  ) : (
                    <p className="text-xs text-gray-600">[ Visual Generated via Nebius ]</p>
                  )}
                </div>
                {renderedAdUrl && (
                  <button
                    onClick={() => handleDownload(renderedAdUrl, 'ai-studio-ad.png')}
                    className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-emerald-400 rounded border border-gray-700 mt-2 font-medium"
                  >
                    Download Image ↓
                  </button>
                )}
              </div>
            </div>

            {campaignData?.hooks && (
              <div className="bg-[#0A0D14] p-4 rounded-lg border border-gray-800 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase">
                    Generated Ad Hooks (NVIDIA Nemotron):
                  </h4>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded border border-emerald-500/30 font-medium transition-all"
                  >
                    {copied ? 'Copied! ✓' : 'Copy Hooks'}
                  </button>
                </div>
                <ul className="list-disc list-inside space-y-2 text-xs text-gray-300">
                  {campaignData.hooks.map((hook: string, idx: number) => (
                    <li key={idx}>{hook}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
