'use client';

import React, { useState } from 'react';
import { Sparkles, Wand2, Bot, Palette, CheckCircle2, Loader2, Image as ImageIcon, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AgentArtStudio() {
  const [productUrl, setProductUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { name: 'Brand & Vision Agent', desc: 'Analyzing product style & color palette', icon: Palette },
    { name: 'Creative Strategy Agent', desc: 'Generating ad hooks with NVIDIA Nemotron 3 Ultra', icon: Wand2 },
    { name: 'Generative Design Agent', desc: 'Rendering HD ad campaign visuals on Nebius', icon: ImageIcon },
    { name: 'Brand Auditor Agent', desc: 'Evaluating visual consistency & tone', icon: ShieldCheck },
  ];

  const handleStartCampaign = () => {
    if (!productUrl) return;
    setIsGenerating(true);
    setCurrentStep(1);

    // Dynamic steps simulation
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          setIsGenerating(false);
          return 4;
        }
        return prev + 1;
      });
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AgentArt AI
            </h1>
            <p className="text-xs text-slate-400">Powered by NVIDIA Nemotron & Nebius Token Factory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Nebius Engine Active
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Control Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" /> Launch AI Campaign
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter your product URL or upload an asset to activate the multi-agent creative pipeline.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Product URL / Asset Source</label>
                <input
                  type="url"
                  placeholder="https://yourbrand.com/products/sneaker-x"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                onClick={handleStartCampaign}
                disabled={isGenerating || !productUrl}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Agents Running...
                  </>
                ) : (
                  <>
                    Generate Campaign <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Workflow Agent Status */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl flex-1">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider text-xs">
              Autonomous Agent Workflow
            </h3>
            <div className="space-y-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isDone = currentStep > idx + 1 || currentStep === 4;
                const isActive = currentStep === idx + 1 && isGenerating;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 p-3 rounded-xl transition-all border ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isDone
                        ? 'bg-slate-950/50 border-slate-800/80'
                        : 'bg-slate-950/20 border-slate-900 opacity-40'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{step.name}</div>
                      <div className="text-xs text-slate-400">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Output Showcase */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" /> Campaign Creative Output
              </h2>
              {currentStep === 4 && (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-medium">
                  Completed in 10s
                </span>
              )}
            </div>

            {currentStep === 0 && (
              <div className="h-96 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-3">
                <Bot className="w-12 h-12 stroke-1" />
                <p className="text-sm">Enter a product link and click "Generate Campaign" to start.</p>
              </div>
            )}

            {currentStep > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative group">
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-md text-xs font-medium border border-slate-700">
                    Hero Shot (Instagram)
                  </div>
                  <div className="w-full h-full flex items-center justify-center bg-slate-900/40 text-slate-600 text-xs">
                    {currentStep >= 3 ? '[ Visual Generated via Nebius ]' : 'Generating...'}
                  </div>
                </div>

                <div className="aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative group">
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-md text-xs font-medium border border-slate-700">
                    Lifestyle Story
                  </div>
                  <div className="w-full h-full flex items-center justify-center bg-slate-900/40 text-slate-600 text-xs">
                    {currentStep >= 3 ? '[ Visual Generated via Nebius ]' : 'Generating...'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentStep === 4 && (
            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-end gap-3">
              <button className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors">
                Export Assets
              </button>
              <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
                Publish Campaign
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
