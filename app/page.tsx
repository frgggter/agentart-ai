'use client';

import { useState } from 'react';

export default function Home() {
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [campaignData, setCampaignData] = useState<any>(null);

  const handleGenerate = async () => {
    if (!productUrl) return;
    setLoading(true);
    setCampaignData(null);
    setActiveStep(1);

    // Simulación paso a paso del pipeline multi-agente
    setTimeout(() => setActiveStep(2), 2000);
    setTimeout(() => setActiveStep(3), 4000);
    setTimeout(() => setActiveStep(4), 6000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setCampaignData(json.data);
      } else {
        alert(json.error || 'Error al generar la campaña');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!campaignData) return;
    const blob = new Blob([JSON.stringify(campaignData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-assets.json';
    a.click();
  };

  const handlePublish = () => {
    alert('¡Campaña enviada a publicación en Meta Ads & Google Ads!');
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
              Enter your product URL or upload an asset to activate the multi-agent creative pipeline.
            </p>
            <input
              type="text"
              placeholder="https://www.apple.com/iphone"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#0A0D14] border border-gray-700 text-white mb-4 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Processing Workflow...' : 'Generate Campaign →'}
            </button>
          </div>

          <div className="bg-[#121722] p-6 rounded-xl border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Autonomous Agent Workflow
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Brand & Vision Agent', desc: 'Analyzing product style & color palette' },
                { name: 'Creative Strategy Agent', desc: 'Generating ad hooks with NVIDIA Nemotron 3 Ultra' },
                { name: 'Generative Design Agent', desc: 'Rendering HD ad campaign visuals on Nebius' },
                { name: 'Brand Auditor Agent', desc: 'Evaluating visual consistency & tone' },
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

        {/* Columna Derecha: Output y Render de Imágenes */}
        <div className="bg-[#121722] p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Campaign Creative Output</h2>
              {campaignData && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  Completed in 10s
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0A0D14] border border-gray-800 rounded-lg p-3 text-center min-h-[220px] flex flex-col justify-center items-center overflow-hidden">
                <span className="text-xs text-gray-400 mb-2 block">Hero Shot (Instagram)</span>
                {campaignData?.images?.heroShot ? (
                  <img src={campaignData.images.heroShot} alt="Hero Shot" className="w-full h-40 object-cover rounded-md" />
                ) : (
                  <p className="text-xs text-gray-600">[ Visual Generated via Nebius ]</p>
                )}
              </div>

              <div className="bg-[#0A0D14] border border-gray-800 rounded-lg p-3 text-center min-h-[220px] flex flex-col justify-center items-center overflow-hidden">
                <span className="text-xs text-gray-400 mb-2 block">Lifestyle Story</span>
                {campaignData?.images?.lifestyleStory ? (
                  <img src={campaignData.images.lifestyleStory} alt="Lifestyle Story" className="w-full h-40 object-cover rounded-md" />
                ) : (
                  <p className="text-xs text-gray-600">[ Visual Generated via Nebius ]</p>
                )}
              </div>
            </div>

            {campaignData?.hooks && (
              <div className="bg-[#0A0D14] p-4 rounded-lg border border-gray-800 mb-4">
                <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Generated Ad Hooks (NVIDIA Nemotron):</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                  {campaignData.hooks.map((hook: string, idx: number) => (
                    <li key={idx}>{hook}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-800">
            <button
              onClick={handleExport}
              disabled={!campaignData}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-sm font-semibold rounded-lg border border-gray-700 disabled:opacity-40"
            >
              Export Assets
            </button>
            <button
              onClick={handlePublish}
              disabled={!campaignData}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-semibold rounded-lg disabled:opacity-40"
            >
              Publish Campaign
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
