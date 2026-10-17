'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [productUrl, setProductUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [lifestyleCanvasUrl, setLifestyleCanvasUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
        setProductUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Procesa la imagen en un Canvas de HTML5 para renderizar un escenario publicitario real
  useEffect(() => {
    if (!campaignData?.images?.heroShot) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = campaignData.images.heroShot;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dibujar fondo de estudio de lujo con gradiente radial de iluminación
      const bgGradient = ctx.createRadialGradient(400, 350, 50, 400, 400, 500);
      bgGradient.addColorStop(0, '#1F2937');
      bgGradient.addColorStop(0.5, '#111827');
      bgGradient.addColorStop(1, '#030712');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 800, 800);

      // Sombra proyectada del producto en el suelo
      ctx.beginPath();
      ctx.ellipse(400, 680, 220, 40, 0, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.filter = 'blur(15px)';
      ctx.fill();
      ctx.filter = 'none';

      // Renderizar la foto del producto escalada y centrada
      const scale = Math.min(520 / img.width, 520 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (800 - w) / 2;
      const y = (660 - h);

      ctx.drawImage(img, x, y, w, h);

      // Superposición de texto y badge de edición publicitaria
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 40, 160, 36, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#10B981';
      ctx.fillText('STUDIO EDIT', 65, 63);

      setLifestyleCanvasUrl(canvas.toDataURL('image/png'));
    };
  }, [campaignData]);

  async function handleGenerate() {
    const assetInput = selectedImage || productUrl;
    if (!assetInput) {
      alert('Please enter a product URL or upload an image file.');
      return;
    }

    setLoading(true);
    setCampaignData(null);
    setLifestyleCanvasUrl(null);
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 1500);
    setTimeout(() => setActiveStep(3), 3500);
    setTimeout(() => setActiveStep(4), 5500);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: assetInput }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setCampaignData(json.data);
      } else {
        alert(json.error || 'Failed to generate campaign assets.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to generation server.');
    } finally {
      setLoading(false);
    }
  }

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const copyToClipboard = () => {
    if (!campaignData?.hooks) return;
    const textToCopy = campaignData.hooks.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0A0D14] text-white p-8">
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
        {/* Columna Izquierda: Input y Workflow */}
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

        {/* Columna Derecha: Output y Descargas */}
        <div className="bg-[#121722] p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Campaign Creative Output</h2>
              {campaignData && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  Completed in 8.
