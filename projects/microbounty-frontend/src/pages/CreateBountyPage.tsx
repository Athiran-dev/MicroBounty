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

  const fee = (Number(formData.rewardAlgo || 0) * 0.05).toFixed(2);
  const escrowLocked = (Number(formData.rewardAlgo || 0) * 0.95).toFixed(2);
  const totalCommitment = Number(formData.rewardAlgo || 0).toFixed(2);

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
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#12141C] pt-32 pb-20 px-6 transition-colors duration-200">
      <div className="max-w-[1240px] mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Form Side */}
          <div className="lg:col-span-7">
            <header className="mb-12">
              <h1 className="text-5xl font-display font-black text-gray-900 dark:text-white mb-4 tracking-tight">Initiate Bounty</h1>
              <p className="text-gray-500 dark:text-[#94A3B8] text-lg font-light">Deploy a new micro-task to the decentralized hunter network.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest mb-4">Bounty Title</label>
                  <input
                    required
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-lg px-5 py-4 text-gray-900 dark:text-white focus:border-[#6D28D9] dark:focus:border-[#C4A1FF] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#64748B]"
                    placeholder="e.g. Audit Smart Contract v2.0"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest">Description</label>
                    <span className="text-[10px] text-gray-400 dark:text-[#64748B] font-medium">Markdown Supported</span>
                  </div>
                  <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-lg overflow-hidden focus-within:border-brand-primary transition-all">
                    <div className="flex gap-4 px-4 py-2 border-b border-gray-200 dark:border-[#262A36] bg-white dark:bg-[#15171E]">
                      <button type="button" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white transition-colors"><span className="font-bold">B</span></button>
                      <button type="button" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white transition-colors italic">I</button>
                      <button type="button" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white transition-colors"><Zap className="w-3.5 h-3.5" /></button>
                      <button type="button" className="text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white transition-colors">{'< >'}</button>
                    </div>
                    <textarea
                      required
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      rows={6}
                      className="w-full bg-transparent p-5 text-gray-900 dark:text-white outline-none resize-none placeholder:text-gray-400 dark:text-[#64748B] font-light"
                      placeholder="Describe the task requirements, deliverables, and acceptance criteria..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest mb-4">Reward (ALGO)</label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        value={formData.rewardAlgo}
                        onChange={e => setFormData(p => ({ ...p, rewardAlgo: e.target.value }))}
                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-lg px-5 py-4 text-gray-900 dark:text-white focus:border-[#6D28D9] dark:focus:border-[#C4A1FF] outline-none transition-all pr-16 font-mono"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-[#64748B]">ALGO</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest mb-4">Deadline</label>
                    <div className="relative">
                       <input
                        required
                        type="date"
                        value={formData.deadline}
                        onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-lg px-5 py-4 text-gray-900 dark:text-white focus:border-[#6D28D9] dark:focus:border-[#C4A1FF] outline-none transition-all pr-12"
                      />
                      <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#64748B] pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest mb-4">Hunter Limit</label>
                    <div className="flex flex-col gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, maxApplicants: '999' }))}
                        className={`w-full py-4 rounded-xl text-xs font-black tracking-widest transition-all border flex items-center justify-center gap-3 ${
                          formData.maxApplicants === '999' 
                            ? 'bg-[#6D28D9] border-brand-primary text-gray-900 dark:text-white shadow-lg shadow-brand-primary/20' 
                            : 'bg-white dark:bg-[#15171E] border-gray-200 dark:border-[#262A36] text-gray-500 dark:text-[#94A3B8] hover:border-gray-300'
                        }`}
                      >
                        <Zap className={`w-4 h-4 ${formData.maxApplicants === '999' ? 'text-gray-900 dark:text-white animate-pulse' : 'text-gray-400 dark:text-[#64748B]'}`} />
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
                                ? 'bg-[#E9D5FF] border-[#C084FC] text-gray-900 dark:text-white' 
                                : 'bg-white dark:bg-[#15171E] border-gray-200 dark:border-[#262A36] text-gray-400 dark:text-[#64748B] hover:border-gray-200 dark:border-[#262A36]'
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
                            className={`w-full h-full bg-white dark:bg-[#15171E] border rounded-xl px-2 text-center text-[10px] font-bold focus:border-brand-primary outline-none transition-all placeholder:text-gray-300 ${
                              !['999', '3', '4', '5'].includes(formData.maxApplicants) && formData.maxApplicants !== ''
                                ? 'border-brand-primary text-gray-900 dark:text-white bg-[#F3E8FF]'
                                : 'border-gray-200 dark:border-[#262A36] text-gray-400 dark:text-[#64748B]'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[11px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest">Payout Split (%)</label>
                      <Info className="w-3.5 h-3.5 text-gray-400 dark:text-[#64748B]" />
                    </div>
                    <input
                      value={formData.split}
                      onChange={e => setFormData(p => ({ ...p, split: e.target.value }))}
                      className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-lg px-5 py-4 text-center text-gray-900 dark:text-white font-mono text-sm focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6D28D9] hover:bg-[#6D28D9]/90 text-gray-900 dark:text-white py-6 rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-brand-primary/20 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Lock className="w-5 h-5" />}
                  Create & Lock Funds
                </button>
              </div>
            </form>
          </div>

          {/* Preview Side */}
          <div className="lg:col-span-5 sticky top-32">
            <GlassCard className="p-10 bg-white dark:bg-[#15171E] shadow-sm border-gray-200 dark:border-[#262A36] relative overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                 <span className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-[0.3em]">Bounty Preview</span>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981]" />
                   <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Preview</span>
                 </div>
               </div>

               <div className="relative mb-10 rounded-2xl overflow-hidden aspect-[16/9] bg-gray-100">
                  <img 
                    src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2664" 
                    alt="Holographic Preview" 
                    className="w-full h-full object-cover opacity-50 mix-blend-screen"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
               </div>

               <div className="space-y-6 mb-12">
                 <h2 className="text-3xl font-display font-black text-gray-900 dark:text-white leading-tight truncate">
                   {formData.title || 'Project Title Appears Here'}
                 </h2>
                 <div className="flex gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] text-[10px] font-bold text-gray-500 dark:text-[#94A3B8]">
                      <Zap className="w-3.5 h-3.5" /> {formData.rewardAlgo} ALGO
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] text-[10px] font-bold text-gray-500 dark:text-[#94A3B8]">
                      <Users className="w-3.5 h-3.5" /> {formData.maxApplicants === '999' ? 'DYNAMIC' : `${formData.maxApplicants} Slots`}
                    </div>
                 </div>
                 <p className="text-sm text-gray-400 dark:text-[#64748B] leading-relaxed font-light italic">
                   {formData.description || 'Start typing to see your description previewed here. Your task will be visible to thousands of specialized hunters across the Algorand ecosystem.'}
                 </p>
               </div>

               <div className="space-y-4 pt-10 border-t border-gray-200 dark:border-[#262A36]">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-gray-400 dark:text-[#64748B]">Escrow Locked (95%)</span>
                   <span className="text-slate-300">{escrowLocked} ALGO</span>
                 </div>
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-gray-400 dark:text-[#64748B]">Platform Fee (5%)</span>
                   <span className="text-slate-300">{fee} ALGO</span>
                 </div>
                 <div className="flex justify-between items-end">
                   <span className="text-xl font-display font-black text-gray-900 dark:text-white">You Pay</span>
                   <span className="text-2xl font-display font-black text-[#6D28D9]">{totalCommitment} <span className="text-[10px] text-gray-400 dark:text-[#64748B] tracking-widest ml-1">ALGO</span></span>
                 </div>
               </div>
            </GlassCard>
            
            <footer className="mt-20 flex justify-between text-[11px] font-medium text-gray-400 dark:text-[#64748B] uppercase tracking-widest px-4">
              <span className="text-gray-900 dark:text-white font-bold">MicroBounty</span>
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
