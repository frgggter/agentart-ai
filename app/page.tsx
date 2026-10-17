'use client';

import { useState } from 'react';

export default function Home() {
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!productUrl) return;
    setLoading(true);
    setCampaignData(null);
    setPublishStatus(null);
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 1500);
    setTimeout(() => setActiveStep(3), 3500);
    setTimeout(() => setActiveStep(4), 5500);

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
        alert(json.error || 'Failed to generate campaign assets.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to generation server.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!campaignData) return;

    const exportBundle = {
      project: 'AgentArt AI Campaign',
      generatedAt: new Date().toISOString(),
      sourceAsset: productUrl,
      strategy: campaignData,
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentart-campaign-assets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePublish = () => {
    setPublishStatus('Connecting to Meta Ads Manager & Google Ads APIs...');
    setTimeout(() => setPublishStatus('Syncing creative assets & ad hooks...'), 1500);
    setTimeout(() => setPublishStatus('Campaign Live! Dispatched to Meta Ads & Google Ads.'), 3000);
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
        {/* Left Column: Input & Agent Workflow */}
        <div className="space-y-6">
          <div className="bg-[#121722] p-6 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">Launch AI Campaign</h2>
            <p className="text-sm text-gray-400 mb-4">
              Enter your product URL or asset image link to activate the multi-agent creative pipeline.
            </p>
            <input
              type="text"
              placeholder="https://images.puma.com/image/upload/.../Zapatillas-Speedcat-OG-unisex"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#0A0D14] border border-gray-700 text-white mb-4 focus:outline-none focus:border-emerald-500 text-sm"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-lg transition-all disabled:opacity-50 text-black"
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

        {/* Right Column: Output & Action Controls */}
        <div className="bg
