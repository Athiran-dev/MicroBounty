import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ShieldCheck, Plus, Settings2, ShieldAlert, TestTube2, Image as ImageIcon, Bot, Brain, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageUpload from '../../components/ImageUpload';
import { useWallet } from '@txnlab/use-wallet-react';
import { useAiContractMocks } from '../../hooks/useAiContractMocks';
import { useSnackbar } from 'notistack';
import { getSupabase } from '../../utils/supabaseClient';

export default function RegisterAgent() {
  const [activeStep, setActiveStep] = useState(1);
  const [agentData, setAgentData] = useState({
    name: '',
    tagline: '',
    description: '',
    avatar_url: '',
    price: 1250,
    endpoint: '',
    category: 'NLP',
    preview_images: ['', '', '']
  });

  const { activeAddress } = useWallet();
  const { registerAgent } = useAiContractMocks();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Please connect your wallet', { variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      enqueueSnackbar('Staking 100 ALGO on-chain...', { variant: 'info' });
      // The registerAgent hook expects stake in ALGO, and price in microAlgo
      const priceMicroAlgo = agentData.price * 1_000_000;
      const agentId = await registerAgent(100, priceMicroAlgo);
      
      if (!agentId) throw new Error('Registration failed on-chain');

      enqueueSnackbar('Agent registered successfully on-chain! Saving...', { variant: 'info' });
      
      const supabase = getSupabase(activeAddress);
      const { error } = await supabase.from('ai_agents').insert({
        agent_id: agentId,
        developer_wallet: activeAddress,
        name: agentData.name,
        tagline: agentData.tagline,
        description: agentData.description,
        avatar_url: agentData.avatar_url,
        price_per_task_algo: agentData.price,
        endpoint_url: agentData.endpoint,
        tech_tags: [agentData.category],
        preview_images: agentData.preview_images.filter(Boolean)
      });

      if (error) throw error;
      
      enqueueSnackbar('Agent fully registered!', { variant: 'success' });
    } catch (e: any) {
      console.error(e);
      enqueueSnackbar(e.message || 'Registration failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Config' },
    { num: 3, label: 'Samples' },
    { num: 4, label: 'Stake' },
  ];

  const updatePreviewImage = (index: number, url: string) => {
    const newPreviews = [...agentData.preview_images];
    newPreviews[index] = url;
    setAgentData({ ...agentData, preview_images: newPreviews });
  };

  return (
    <DashboardLayout showSidebar={false}>
      <div className="p-10 max-w-7xl mx-auto text-gray-900 dark:text-white font-sans min-h-[calc(100vh-64px)] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Register New AI Agent</h1>
            <p className="text-gray-500 dark:text-[#94A3B8] text-sm">Connect your autonomous model to the MicroBounty marketplace.</p>
          </div>
          <div className="px-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-lg text-xs font-medium text-gray-500 dark:text-[#94A3B8] shadow-sm">
            Draft Saved 12:04 PM
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-2xl p-8 mb-8 shadow-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto relative">
            <div className="absolute left-0 top-6 w-full h-[1px] bg-gray-200 dark:bg-gray-800 z-0" />
            {steps.map((step) => (
              <div key={step.num} className="relative z-10 flex flex-col items-center gap-3 bg-white dark:bg-[#15171E] px-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                  activeStep >= step.num 
                    ? 'bg-[#6D28D9] text-white shadow-md shadow-[#6D28D9]/20' 
                    : 'bg-white dark:bg-[#15171E] border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-[#64748B]'
                }`}>
                  {step.num}
                </div>
                <span className={`text-xs font-bold ${activeStep >= step.num ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-[#64748B]'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-8">
            {activeStep === 1 && (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl p-8 flex flex-col shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <ShieldAlert className="w-6 h-6 text-[#6D28D9]" />
                  <h2 className="text-xl font-bold">Agent Identity</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">Agent Name</label>
                    <input 
                      type="text" 
                      value={agentData.name}
                      onChange={(e) => setAgentData({...agentData, name: e.target.value})}
                      placeholder="e.g. Vision-Alpha-7"
                      className="w-full bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">Tagline</label>
                    <input 
                      type="text" 
                      value={agentData.tagline}
                      onChange={(e) => setAgentData({...agentData, tagline: e.target.value})}
                      placeholder="Specialized NLP for financial audits"
                      className="w-full bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                    />
                  </div>

                  <ImageUpload 
                    label="Avatar (Profile Image)"
                    value={agentData.avatar_url}
                    onUpload={(url) => setAgentData({...agentData, avatar_url: url})}
                    className="mb-2"
                  />
                  <p className="mt-2 text-[10px] text-gray-500 font-medium italic">Square image recommended. High-quality avatars build trust.</p>

                  <div className="pt-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">Detailed Description</label>
                    <textarea 
                      rows={4}
                      value={agentData.description}
                      onChange={(e) => setAgentData({...agentData, description: e.target.value})}
                      placeholder="Describe the model's capabilities, architecture, and typical response time..."
                      className="w-full bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl p-8 flex flex-col shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <Settings2 className="w-6 h-6 text-[#6D28D9]" />
                  <h2 className="text-xl font-bold">Technical Configuration</h2>
                </div>

                <div className="space-y-10">
                  <div>
                    <label className="block text-gray-900 dark:text-white font-bold text-sm mb-4">Core Capability</label>
                    <div className="flex flex-wrap gap-3">
                      {['NLP', 'Data Mining', 'Image Gen', 'Sentiment', 'Security Audit'].map(cat => (
                        <div 
                          key={cat}
                          onClick={() => setAgentData({...agentData, category: cat})}
                          className={`px-4 py-2 rounded-full border transition-all cursor-pointer text-sm font-medium ${
                            agentData.category === cat 
                              ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-md shadow-[#6D28D9]/20' 
                              : 'bg-white dark:bg-[#15171E] border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm">Price Per Execution</label>
                      <span className="text-2xl font-black text-[#059669]">{agentData.price} ALGO</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="5000" 
                      value={agentData.price}
                      onChange={(e) => setAgentData({...agentData, price: Number(e.target.value)})}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#6D28D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">Endpoint URL</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        value={agentData.endpoint}
                        onChange={(e) => setAgentData({...agentData, endpoint: e.target.value})}
                        placeholder="https://api.yournode.com/v1/exec"
                        className="flex-1 bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                      />
                      <button className="px-6 py-4 rounded-xl border border-[#059669]/30 text-[#059669] font-bold hover:bg-[#D1FAE5] transition-colors flex items-center gap-2">
                        <TestTube2 className="w-4 h-4" /> Test
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl p-8 flex flex-col shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <ImageIcon className="w-6 h-6 text-[#6D28D9]" />
                  <h2 className="text-xl font-bold">Visual Proof & Samples</h2>
                </div>

                <p className="text-sm text-gray-500 dark:text-[#94A3B8] mb-8">
                  Upload URLs for screenshots or generated outputs to show potential clients what your agent can do.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agentData.preview_images.map((url, i) => (
                    <ImageUpload 
                      key={i}
                      label={`Sample Output ${i + 1}`}
                      value={url}
                      onUpload={(newUrl) => updatePreviewImage(i, newUrl)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl p-8 flex flex-col shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <Bot className="w-6 h-6 text-[#6D28D9]" />
                  <h2 className="text-xl font-bold">Confirm & Stake</h2>
                </div>

                <div className="p-6 rounded-2xl bg-[#F3E8FF] border border-[#6D28D9]/20 mb-8">
                  <h3 className="font-bold text-[#6D28D9] mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" /> Protocol Requirement
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    To register an agent in the marketplace, you must stake 100 ALGO. This stake ensures agent availability and acts as collateral for quality disputes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between p-4 bg-gray-50 dark:bg-[#1A1D24] rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400">Agent Name</span>
                    <span className="font-bold">{agentData.name || 'Unnamed Agent'}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-gray-50 dark:bg-[#1A1D24] rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400">Execution Fee</span>
                    <span className="font-bold text-[#059669]">{agentData.price} ALGO</span>
                  </div>
                  <div className="flex justify-between p-4 bg-gray-50 dark:bg-[#1A1D24] rounded-xl border-2 border-[#6D28D9]/20">
                    <span className="text-gray-900 dark:text-white font-bold">Required Stake</span>
                    <span className="font-black text-[#6D28D9]">100.00 ALGO</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-8 flex justify-between items-center py-6 border-t border-gray-200 dark:border-[#262A36]">
              {activeStep > 1 ? (
                <button 
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white font-bold transition-colors flex items-center gap-2"
                >
                  <span>←</span> Back to {steps[activeStep - 2].label}
                </button>
              ) : (
                <Link to="/ai-tasks" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white font-bold transition-colors flex items-center gap-2">
                  <span>←</span> Cancel
                </Link>
              )}
              
              <div className="flex gap-4">
                <button className="px-8 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-[#262A36]">
                  Save Draft
                </button>
                <button 
                  disabled={loading}
                  onClick={() => {
                    if (activeStep < 4) setActiveStep(prev => prev + 1);
                    else handleRegister();
                  }}
                  className="px-8 py-3 rounded-xl bg-[#6D28D9] text-white font-bold hover:bg-[#5B21B6] transition-colors shadow-md shadow-[#6D28D9]/20 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (activeStep === 4 ? 'Confirm & Stake' : `Continue to ${steps[activeStep].label}`)}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Column (Sticky) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-10 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-[#6D28D9]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Marketplace Preview</h3>
              </div>

              {/* Agent Card Preview */}
              <div className="glass-card rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-xl scale-95 origin-top">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F3E8FF] flex items-center justify-center overflow-hidden border border-[#6D28D9]/20">
                      {agentData.avatar_url ? (
                        <img src={agentData.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Bot className="w-6 h-6 text-[#6D28D9]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight">{agentData.name || 'Unnamed Agent'}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#6D28D9]/10 text-[#6D28D9] text-[9px] font-bold uppercase tracking-wider">{agentData.category}</span>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> 100%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] line-clamp-2 mb-6 leading-relaxed h-8">
                  {agentData.tagline || 'No tagline provided yet.'}
                </p>

                {/* Sample Previews in Card */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {agentData.preview_images.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden">
                      {url ? (
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#334155] mt-auto">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-wider mb-0.5">Price</p>
                    <p className="font-black text-lg text-gray-900 dark:text-white">{agentData.price} ALGO</p>
                  </div>
                  <div className="bg-[#6D28D9] text-white px-4 py-2 rounded-lg font-bold text-xs">
                    Select
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Layout Tips
                </h4>
                <ul className="text-[11px] text-gray-500 dark:text-[#94A3B8] space-y-2">
                  <li>• High quality avatar increases clicks by 40%</li>
                  <li>• Use clear samples of your agent's typical output</li>
                  <li>• Descriptive taglines help users find your agent</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
