import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { ShieldCheck, Plus, Settings2, ShieldAlert, TestTube2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RegisterAgent() {
  const [activeStep, setActiveStep] = useState(1);
  const [price, setPrice] = useState(1250);

  const steps = [
    { num: 1, label: 'Info' },
    { num: 2, label: 'Config' },
    { num: 3, label: 'Samples' },
    { num: 4, label: 'Stake' },
  ];

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
            <div className="absolute left-0 top-6 w-full h-[1px] bg-gray-200 z-0" />
            {steps.map((step) => (
              <div key={step.num} className="relative z-10 flex flex-col items-center gap-3 bg-white dark:bg-[#15171E] px-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                  activeStep >= step.num 
                    ? 'bg-[#6D28D9] text-white shadow-md shadow-[#6D28D9]/20' 
                    : 'bg-white dark:bg-[#15171E] border border-gray-300 text-gray-400 dark:text-[#64748B]'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          
          {/* Identity Column */}
          <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl p-8 flex flex-col shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <ShieldAlert className="w-6 h-6 text-[#6D28D9]" />
              <h2 className="text-xl font-bold">Identity</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">Agent Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Vision-Alpha-7"
                  className="w-full bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-[#64748B] focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">Tagline</label>
                <input 
                  type="text" 
                  placeholder="Specialized NLP for financial audits"
                  className="w-full bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-[#64748B] focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">Description</label>
                <textarea 
                  rows={4}
                  placeholder="Describe the model's capabilities, architecture, and typical response time..."
                  className="w-full bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-[#64748B] focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all resize-none"
                />
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-[#6D28D9]/20 bg-[#F3E8FF]">
                <ShieldCheck className="w-5 h-5 text-[#6D28D9]" />
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  Identity verification via Zero-Knowledge proof is recommended for high-tier bounties.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Column */}
          <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl p-8 flex flex-col shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Settings2 className="w-6 h-6 text-[#6D28D9]" />
              <h2 className="text-xl font-bold">Configuration</h2>
            </div>

            <div className="space-y-10">
              
              {/* Task Type Capabilities */}
              <div>
                <label className="block text-gray-900 dark:text-white font-bold text-sm mb-4">Task Type Capability</label>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 rounded-full bg-[#6D28D9] text-white text-sm font-medium flex items-center gap-2 cursor-pointer shadow-md shadow-[#6D28D9]/20">
                    NLP <span className="opacity-70 hover:opacity-100 font-bold">×</span>
                  </div>
                  <div className="px-4 py-2 rounded-full bg-white dark:bg-[#15171E] border border-gray-300 text-gray-600 text-sm font-medium hover:text-[#6D28D9] hover:border-[#6D28D9] cursor-pointer transition-colors">
                    Data Mining
                  </div>
                  <div className="px-4 py-2 rounded-full bg-white dark:bg-[#15171E] border border-gray-300 text-gray-600 text-sm font-medium hover:text-[#6D28D9] hover:border-[#6D28D9] cursor-pointer transition-colors">
                    Image Gen
                  </div>
                  <div className="px-4 py-2 rounded-full bg-white dark:bg-[#15171E] border border-gray-300 text-gray-600 text-sm font-medium hover:text-[#6D28D9] hover:border-[#6D28D9] cursor-pointer transition-colors">
                    Sentiment
                  </div>
                  <div className="px-4 py-2 rounded-full border border-dashed border-gray-400 text-gray-500 dark:text-[#94A3B8] text-sm font-medium hover:text-gray-900 dark:text-white hover:border-gray-900 cursor-pointer transition-colors flex items-center gap-2 bg-gray-50 dark:bg-[#1A1D24]">
                    <Plus className="w-4 h-4" /> Add
                  </div>
                </div>
              </div>

              {/* Price Slider */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block text-gray-700 font-bold text-sm">Price Per Execution</label>
                  <span className="text-2xl font-black text-[#059669]">{price} ALGO</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5000" 
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6D28D9]"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400 dark:text-[#64748B] font-bold">1 ALGO</span>
                  <span className="text-[10px] text-gray-400 dark:text-[#64748B] font-bold">5000 ALGO</span>
                </div>
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">Endpoint URL</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="https://api.yournode.com/v1/exec"
                    className="flex-1 bg-gray-50 dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] rounded-xl px-4 py-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-[#64748B] focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                  />
                  <button className="px-6 py-4 rounded-xl border border-[#059669]/30 text-[#059669] font-bold hover:bg-[#D1FAE5] transition-colors flex items-center gap-2">
                    <TestTube2 className="w-4 h-4" /> Test
                  </button>
                </div>
                
                <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-[#D1FAE5] border border-[#059669]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
                    <span className="text-sm font-bold text-[#065F46]">Endpoint Ready</span>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Latency: 42ms</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-between items-center py-6 border-t border-gray-200 dark:border-[#262A36]">
          <Link to="/ai-tasks" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white font-bold transition-colors flex items-center gap-2">
            <span>←</span> Cancel Registration
          </Link>
          <div className="flex gap-4">
            <button className="px-8 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors border border-gray-200 dark:border-[#262A36]">
              Save as Draft
            </button>
            <button className="px-8 py-3 rounded-xl bg-[#6D28D9] text-white font-bold hover:bg-[#5B21B6] transition-colors shadow-md shadow-[#6D28D9]/20">
              Continue to Samples
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
