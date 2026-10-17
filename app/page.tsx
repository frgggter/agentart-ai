'use client';

import { useState } from 'react';

export default function Home() {
  const [productUrl, setProductUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [executionTime, setExecutionTime] = useState<string | null>(null);

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

  const handleGenerate = async () => {
    const assetInput = selectedImage || productUrl;
    if (!assetInput) {
      alert('Please enter a product URL or upload an image file.');
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setCampaignData(null);
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
                <div className="w-full h-40 flex items-center justify-center p-2 rounded-md my-auto bg-[#0A0D14]">
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

              {/* Contextual Rendered Studio Visual (Blend mode elimina el fondo blanco nativamente) */}
              <div className="bg-[#0A0D14] border border-gray-800 rounded-lg p-3 text-center flex flex-col justify-between items-center min-h-[260px]">
                <span className="text-xs text-gray-400 mb-1 block font-medium">Studio Ad Visual (AI Context)</span>
                <div className="w-full h-40 flex items-center justify-center rounded-md my-auto relative overflow-hidden bg-gradient-to-tr from-amber-950/80 via-emerald-950/50 to-slate-900 border border-emerald-500/40 p-2 shadow-2xl">
                  {campaignData ? (
                    <>
                      <img 
                        src={activeImage} 
                        alt="Studio Visual" 
                        className="max-h-full max-w-full object-contain mix-blend-multiply filter contrast-125 saturate-110 drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]" 
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-bold tracking-widest bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase shadow">
                        AI Studio
                      </span>
                    </>
                  ) : (
                    <p className="text-xs text-gray-600">[ Visual Generated via Nebius ]</p>
                  )}
                </div>
                {campaignData && (
                  <button
                    onClick={() => handleDownload(activeImage, 'ai-studio-ad.png')}
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
