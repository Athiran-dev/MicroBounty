import { useState, useEffect } from 'react';
import { Search, Plus, Filter, ArrowDownWideNarrow, AlertCircle, Terminal, Activity, Zap, Users, Clock } from 'lucide-react';
import BountyCard from '../components/BountyCard';
import { fetchBounties } from '../utils/supabase-helpers';
import { BountyWithApplicants } from '../utils/supabase-types';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Link } from 'react-router-dom';

export default function ExplorePage() {
  const [bounties, setBounties] = useState<BountyWithApplicants[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const loadBounties = async () => {
      setLoading(true);
      try {
        const data = await fetchBounties({ 
          status: filterStatus === 'all' ? undefined : filterStatus
        });
        setBounties(data || []);
      } catch (err) {
        console.error('Failed to load bounties', err);
      } finally {
        setLoading(false);
      }
    };
    loadBounties();
  }, [filterStatus]);

  const filteredBounties = (bounties || []).filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#12141C] pt-32 pb-20 px-6 transition-colors duration-200">
      <div className="max-w-[1240px] mx-auto w-full">
        
        {/* Header Area */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-12 mb-16">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter text-gray-900 dark:text-white leading-none">
              Ethereal <span className="text-[#6D28D9] drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">Opportunities.</span>
            </h1>
            <p className="max-w-xl text-lg font-light leading-relaxed text-gray-500 dark:text-[#94A3B8] italic">
              Browse and contribute to the most prestigious bounties in the Algorand ecosystem. Curated for the digital artisan.
            </p>
          </div>

          <div className="flex flex-col gap-4 items-end">
            <div className="flex glass-card p-1 self-end rounded-full">
              {['all', 'open', 'active', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterStatus === status 
                      ? 'bg-[#6D28D9] text-white shadow-lg shadow-[#6D28D9]/20' 
                      : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white'
                  }`}
                >
                   {status === 'all' ? 'All' : status === 'completed' ? 'Completed' : status === 'active' ? 'In Progress' : 'Open'}
                </button>
              ))}
            </div>
            
            <div className="glass-card rounded-full px-4 py-2 flex items-center gap-3">
               <span className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-widest">Reward: High to Low</span>
               <ArrowDownWideNarrow className="w-3.5 h-3.5 text-gray-400 dark:text-[#64748B]" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <GlassCard key={i} className="h-[320px] animate-pulse opacity-30 border-gray-100 dark:border-[#334155]" />
            ))}
          </div>
        ) : filteredBounties.length > 0 ? (
          <div className="space-y-12">
            <motion.div 
              layout
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredBounties.map((bounty, i) => (
                  <motion.div 
                    key={bounty.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                  >
                    <BountyCard bounty={bounty} />
                  </motion.div>
                ))}
                
                {/* Visual Placeholder to match image grid count if needed */}
                <Link 
                  to="/create"
                  className="lg:col-span-1 border border-dashed border-gray-200 dark:border-[#262A36] rounded-3xl flex items-center justify-center bg-white dark:bg-[#15171E] min-h-[300px] group transition-all hover:bg-gray-50 dark:hover:bg-[#1A1D24]"
                >
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1A1D24] border border-gray-200 dark:border-[#262A36] flex items-center justify-center group-hover:border-[#6D28D9] dark:group-hover:border-[#C4A1FF] transition-all">
                        <Plus className="w-6 h-6 text-gray-400 dark:text-[#64748B] group-hover:text-[#6D28D9] dark:group-hover:text-[#C4A1FF]" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest group-hover:text-gray-900 dark:group-hover:text-white transition-all">Post New Bounty</span>
                   </div>
                </Link>
              </AnimatePresence>
            </motion.div>

            {/* Featured Section */}
            <div className="pt-12">
               <GlassCard className="p-0 overflow-hidden bg-white dark:bg-[#15171E] shadow-sm border-gray-100 dark:border-[#334155]">
                 <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-12 space-y-8">
                       <span className="inline-block px-4 py-1 rounded-full bg-[#6D28D9]/10 border border-brand-primary/20 text-[#6D28D9] text-[10px] font-bold uppercase tracking-widest">
                          Featured Ecosystem Project
                       </span>
                       <h2 className="text-5xl font-display font-black text-gray-900 dark:text-white leading-[1.1]">
                          Algorand Foundation: Governance 2.0 UX
                       </h2>
                       <p className="text-gray-500 dark:text-[#94A3B8] text-lg font-light leading-relaxed max-w-md">
                          Looking for lead architects to design the future of decentralized decision making. Long-term engagement with high rewards.
                       </p>
                       <div className="flex items-center gap-12 pt-4">
                          <button className="bg-[#6D28D9] hover:bg-[#6D28D9]/90 text-gray-900 dark:text-white px-10 py-4 rounded-full font-bold transition-all shadow-xl shadow-brand-primary/20">
                             Apply for Bounty
                          </button>
                          <div>
                             <span className="block text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-widest mb-1">Total Pot</span>
                             <span className="text-3xl font-display font-black text-gray-900 dark:text-white italic">25,000 <span className="text-sm opacity-50 not-italic">ALGO</span></span>
                          </div>
                       </div>
                    </div>
                    <div className="relative h-[400px] lg:h-auto bg-gray-100 dark:bg-[#1A1D24] border-l border-gray-100 dark:border-[#334155] overflow-hidden">
                       <img 
                         src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2564" 
                         alt="Featured Artwork" 
                         className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                       />
                       <div className="absolute inset-0 bg-gradient-to-r from-gray-900 dark:from-black via-transparent to-transparent" />
                    </div>
                 </div>
               </GlassCard>
            </div>
          </div>
        ) : (
          <GlassCard className="text-center py-40 border-dashed border-gray-200 dark:border-[#262A36]">
            <Terminal className="w-16 h-16 text-gray-300 mx-auto mb-8" />
            <p className="text-2xl font-display font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">Zero Records Indexed</p>
            <p className="text-gray-400 dark:text-[#64748B] font-light italic opacity-60 mb-10">The query returned no active campaign matches.</p>
            <button 
              onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
              className="text-[10px] font-bold text-[#6D28D9] border border-brand-primary/30 px-8 py-4 rounded-full hover:bg-[#6D28D9] hover:text-gray-900 dark:text-white transition-all"
            >
              Reset Filters
            </button>
          </GlassCard>
        )}
      </div>

      {/* Floating Action Button */}
      <Link 
        to="/create" 
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-[#6D28D9] text-gray-900 dark:text-white flex items-center justify-center shadow-2xl shadow-brand-primary/40 hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
      </Link>
    </div>
  );
}
