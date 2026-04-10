import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import { useAlgoPrice } from '../hooks/useAlgoPrice';
import { useTransaction } from '../hooks/useTransaction';
import { callCreateBounty } from '../utils/supabase-helpers';
import { Loader2, Lock, Users, Clock, Zap, Info, Hash, AlignLeft, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';

export default function CreateBountyPage() {
  const { activeAddress } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { price } = useAlgoPrice();
  const { createBounty } = useTransaction();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    rewardAlgo: '10',
    maxApplicants: '999',
    deadline: '',
    split: '70 / 20 / 10'
  });

  const usdValue = price && formData.rewardAlgo
    ? (Number(formData.rewardAlgo) * price).toFixed(2)
    : '0.00';

  const fee = (Number(formData.rewardAlgo) * 0.015).toFixed(2);
  const totalCommitment = (Number(formData.rewardAlgo) + Number(fee)).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddress) {
      enqueueSnackbar('Please connect your wallet', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const deadlineDate = formData.deadline ? new Date(formData.deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadlineUnix = Math.floor(deadlineDate.getTime() / 1000);

      enqueueSnackbar('Initiating Smart Contract...', { variant: 'info' });
      
      const [s1, s2, s3] = formData.split.split('/').map(s => parseInt(s.trim()));
      
      const bountyId = await createBounty({
        rewardAmount: Number(formData.rewardAlgo),
        maxApplicants: Number(formData.maxApplicants),
        deadline: deadlineUnix,
        split1: s1 || 100,
        split2: s2 || 0,
        split3: s3 || 0,
      });

      if (bountyId === undefined) throw new Error("Bounty ID generation failed");

      const tagArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

      await callCreateBounty({
        bounty_id: bountyId,
        creator_wallet: activeAddress,
        title: formData.title || 'Untitled Campaign',
        description: formData.description || 'No description provided.',
        tags: tagArray,
        reward_algo: Number(formData.rewardAlgo),
        max_applicants: Number(formData.maxApplicants),
        payout_split: [s1, s2, s3].filter(s => s > 0),
        deadline: deadlineDate.toISOString()
      });

      enqueueSnackbar('Bounty created successfully!', { variant: 'success' });
      navigate(`/explore`);

    } catch (err: any) {
      enqueueSnackbar(err?.message || 'Failed to create bounty', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] pt-32 pb-20 px-6">
      <div className="max-w-[1240px] mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Form Side */}
          <div className="lg:col-span-7">
            <header className="mb-12">
              <h1 className="text-5xl font-display font-black text-white mb-4 tracking-tight">Initiate Bounty</h1>
              <p className="text-slate-400 text-lg font-light">Deploy a new micro-task to the decentralized hunter network.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Bounty Title</label>
                  <input
                    required
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-[#0D1117] border border-white/5 rounded-lg px-5 py-4 text-white focus:border-brand-primary outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. Audit Smart Contract v2.0"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                    <span className="text-[10px] text-slate-600 font-medium">Markdown Supported</span>
                  </div>
                  <div className="bg-[#0D1117] border border-white/5 rounded-lg overflow-hidden focus-within:border-brand-primary transition-all">
                    <div className="flex gap-4 px-4 py-2 border-b border-white/5 bg-white/5">
                      <button type="button" className="text-slate-400 hover:text-white transition-colors"><span className="font-bold">B</span></button>
                      <button type="button" className="text-slate-400 hover:text-white transition-colors italic">I</button>
                      <button type="button" className="text-slate-400 hover:text-white transition-colors"><Zap className="w-3.5 h-3.5" /></button>
                      <button type="button" className="text-slate-400 hover:text-white transition-colors">{'< >'}</button>
                    </div>
                    <textarea
                      required
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      rows={6}
                      className="w-full bg-transparent p-5 text-white outline-none resize-none placeholder:text-slate-600 font-light"
                      placeholder="Describe the task requirements, deliverables, and acceptance criteria..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Reward (ALGO)</label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        value={formData.rewardAlgo}
                        onChange={e => setFormData(p => ({ ...p, rewardAlgo: e.target.value }))}
                        className="w-full bg-[#0D1117] border border-white/5 rounded-lg px-5 py-4 text-white focus:border-brand-primary outline-none transition-all pr-16 font-mono"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">ALGO</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Deadline</label>
                    <div className="relative">
                       <input
                        required
                        type="date"
                        value={formData.deadline}
                        onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
                        className="w-full bg-[#0D1117] border border-white/5 rounded-lg px-5 py-4 text-white focus:border-brand-primary outline-none transition-all pr-12"
                      />
                      <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Hunter Limit</label>
                    <div className="flex flex-col gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, maxApplicants: '999' }))}
                        className={`w-full py-4 rounded-xl text-xs font-black tracking-widest transition-all border flex items-center justify-center gap-3 ${
                          formData.maxApplicants === '999' 
                            ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                            : 'bg-[#0D1117] border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <Zap className={`w-4 h-4 ${formData.maxApplicants === '999' ? 'text-white animate-pulse' : 'text-slate-600'}`} />
                        DYNAMIC_UNLIMITED
                      </button>
                      <div className="flex gap-2">
                        {['3', '4', '5'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, maxApplicants: val }))}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all border ${
                              formData.maxApplicants === val 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-[#0D1117] border-white/5 text-slate-500 hover:border-white/10'
                            }`}
                          >
                             {val}
                          </button>
                        ))}
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="1"
                            max="999"
                            placeholder="Custom"
                            value={['999', '3', '4', '5'].includes(formData.maxApplicants) ? '' : formData.maxApplicants}
                            onChange={(e) => setFormData(p => ({ ...p, maxApplicants: e.target.value }))}
                            className={`w-full h-full bg-[#0D1117] border rounded-xl px-2 text-center text-[10px] font-bold focus:border-brand-primary outline-none transition-all placeholder:text-slate-700 ${
                              !['999', '3', '4', '5'].includes(formData.maxApplicants) && formData.maxApplicants !== ''
                                ? 'border-brand-primary text-white bg-slate-800'
                                : 'border-white/5 text-slate-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Payout Split (%)</label>
                      <Info className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <input
                      value={formData.split}
                      onChange={e => setFormData(p => ({ ...p, split: e.target.value }))}
                      className="w-full bg-[#0D1117] border border-white/5 rounded-lg px-5 py-4 text-center text-white font-mono text-sm focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-6 rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-brand-primary/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Lock className="w-5 h-5" />}
                  Create & Lock Funds
                </button>
              </div>
            </form>
          </div>

          {/* Preview Side */}
          <div className="lg:col-span-5 sticky top-32">
            <GlassCard className="p-10 bg-[#0F172A]/40 border-white/5 relative overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Bounty Preview</span>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981]" />
                   <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Preview</span>
                 </div>
               </div>

               <div className="relative mb-10 rounded-2xl overflow-hidden aspect-[16/9] bg-slate-900">
                  <img 
                    src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2664" 
                    alt="Holographic Preview" 
                    className="w-full h-full object-cover opacity-50 mix-blend-screen"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
               </div>

               <div className="space-y-6 mb-12">
                 <h2 className="text-3xl font-display font-black text-white leading-tight truncate">
                   {formData.title || 'Project Title Appears Here'}
                 </h2>
                 <div className="flex gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                      <Zap className="w-3.5 h-3.5" /> {formData.rewardAlgo} ALGO
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                      <Users className="w-3.5 h-3.5" /> {formData.maxApplicants === '999' ? 'DYNAMIC' : `${formData.maxApplicants} Slots`}
                    </div>
                 </div>
                 <p className="text-sm text-slate-500 leading-relaxed font-light italic">
                   {formData.description || 'Start typing to see your description previewed here. Your task will be visible to thousands of specialized hunters across the Algorand ecosystem.'}
                 </p>
               </div>

               <div className="space-y-4 pt-10 border-t border-white/5">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-slate-500">Platform Fee (1.5%)</span>
                   <span className="text-slate-300">{fee} ALGO</span>
                 </div>
                 <div className="flex justify-between items-end">
                   <span className="text-xl font-display font-black text-white">Total Commitment</span>
                   <span className="text-2xl font-display font-black text-brand-primary">{totalCommitment} <span className="text-[10px] text-slate-500 tracking-widest ml-1">ALGO</span></span>
                 </div>
               </div>
            </GlassCard>
            
            <footer className="mt-20 flex justify-between text-[11px] font-medium text-slate-600 uppercase tracking-widest px-4">
              <span className="text-white font-bold">MicroBounty</span>
              <div className="flex gap-8">
                <span>Documentation</span>
                <span>Privacy Policy</span>
                <span>Terms</span>
              </div>
            </footer>
          </div>

        </div>

      </div>
    </div>
  );
}
