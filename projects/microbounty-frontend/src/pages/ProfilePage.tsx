import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSupabase } from '../utils/supabaseClient';
import { Bounty, Application } from '../utils/supabase-types';
import { shortenAddress } from '../lib/utils';
import BountyCard from '../components/BountyCard';
import { motion } from 'framer-motion';
import { Award, Briefcase, FileCode2 } from 'lucide-react';

import { useWallet } from '@txnlab/use-wallet-react';

export default function ProfilePage() {
  const { wallet_address: paramAddress } = useParams<{ wallet_address: string }>();
  const { activeAddress } = useWallet();
  const wallet_address = paramAddress || activeAddress;
  
  const isConnect = !wallet_address;
  
  const [activeTab, setActiveTab] = useState<'created' | 'applied'>('created');
  const [createdBounties, setCreated] = useState<Bounty[]>([]);
  const [appliedBounties, setApplied] = useState<(Bounty & { applied_at: string })[]>([]);
  const [loading, setLoading] = useState(!isConnect);

  useEffect(() => {
    if (isConnect || !wallet_address) return;

    const fetchProfileData = async () => {
      setLoading(true);
      const supabase = getSupabase();

      try {
        // Fetch created bounties
        const { data: created } = await supabase
          .from('bounties')
          .select('*')
          .eq('creator_wallet', wallet_address)
          .order('created_at', { ascending: false });

        if (created) setCreated(created as Bounty[]);

        // Fetch applied bounties
        const { data: apps } = await supabase
          .from('applications')
          .select('applied_at, bounty_id')
          .eq('hunter_wallet', wallet_address);

        if (apps && apps.length > 0) {
          const ids = apps.map(a => a.bounty_id);
          const { data: bounties } = await supabase
            .from('bounties')
            .select('*')
            .in('bounty_id', ids);

          if (bounties) {
            const joined = bounties.map(b => {
              const app = apps.find(a => a.bounty_id === b.bounty_id);
              return { ...b, applied_at: app?.applied_at || '' } as Bounty & { applied_at: string };
            });
            setApplied(joined.sort((a,b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()));
          }
        }
      } catch (err) {
        console.error("Profile fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [wallet_address, isConnect]);

  if (isConnect) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
        <h2 className="text-3xl font-bold mb-4">Connect Wallet to View Profile</h2>
        <p className="text-brand-muted max-w-md">Use the button in the top right to connect your Algorand wallet and see your bounties.</p>
      </div>
    );
  }

  // Calculate ALGO earned (hacky approximation based on 'paid' status and creator vs hunter)
  // In a real app we'd fetch actual payout txns.
  const algoEarnedApprox = appliedBounties.filter(b => b.status === 'paid').reduce((acc, b) => acc + Number(b.reward_algo), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-32 w-full transition-colors duration-200">
      {/* Header Profile Stats */}
      <div className="glass p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#6D28D9]/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#6D28D9] to-[#059669] p-1 shadow-lg shrink-0">
          <div className="w-full h-full bg-white dark:bg-[#15171E] rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
              {wallet_address?.substring(0, 2)}
            </span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left z-10 text-brand-text">
          <h1 className="text-4xl font-display font-extrabold mb-2 tracking-tight text-gray-900 dark:text-white uppercase italic">
            {shortenAddress(wallet_address!, 8)}
          </h1>
          <a href={`https://testnet.algoexplorer.io/address/${wallet_address}`} target="_blank" rel="noreferrer" className="text-sm text-[#6D28D9] hover:underline">
            View on AlgoExplorer
          </a>

          <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
            <div className="flex items-center gap-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] px-4 py-2 rounded-xl">
              <Briefcase className="w-5 h-5 text-gray-500 dark:text-[#94A3B8]" />
              <div>
                <p className="text-[10px] text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest font-bold">Posted</p>
                <p className="font-black text-lg text-gray-900 dark:text-white">{createdBounties.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] px-4 py-2 rounded-xl">
              <FileCode2 className="w-5 h-5 text-[#6D28D9] dark:text-[#C4A1FF]" />
              <div>
                <p className="text-[10px] text-gray-500 dark:text-[#94A3B8] uppercase tracking-widest font-bold">Applied</p>
                <p className="font-black text-lg text-gray-900 dark:text-white">{appliedBounties.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              <Award className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Earned</p>
                <p className="font-black text-lg text-emerald-500">{algoEarnedApprox.toFixed(2)} ALGO</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-brand-outline-variant mb-8">
        <button 
          onClick={() => setActiveTab('created')}
          className={`pb-4 px-2 font-bold text-lg transition-colors relative ${activeTab === 'created' ? 'text-brand-text' : 'text-brand-text-dim hover:text-brand-text'}`}
        >
          Created Bounties
          {activeTab === 'created' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9]" />}
        </button>
        <button 
          onClick={() => setActiveTab('applied')}
          className={`pb-4 px-2 font-bold text-lg transition-colors relative ${activeTab === 'applied' ? 'text-brand-text' : 'text-brand-text-dim hover:text-brand-text'}`}
        >
          Hunter History
          {activeTab === 'applied' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9]" />}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-3 gap-6 animate-pulse">
          <div className="h-48 glass bg-white dark:bg-[#15171E] rounded-xl"></div>
          <div className="h-48 glass bg-white dark:bg-[#15171E] rounded-xl"></div>
        </div>
      ) : activeTab === 'created' ? (
        createdBounties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {createdBounties.map(b => (
              <BountyCard key={b.id} bounty={{...b, applicant_count: 0}} />
            ))}
          </div>
        ) : (
          <p className="text-brand-text-dim">No bounties posted yet.</p>
        )
      ) : (
        appliedBounties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appliedBounties.map(b => (
              <BountyCard key={b.id} bounty={{...b, applicant_count: 0}} />
            ))}
          </div>
        ) : (
          <p className="text-brand-text-dim">No bounties applied for yet.</p>
        )
      )}
    </div>
  );
}
