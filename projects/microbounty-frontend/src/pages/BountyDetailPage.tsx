import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '@txnlab/use-wallet-react';
import { fetchBountyById, isBountyCreator, hasApplied, callApplyBounty, getSubmissions, markBountyPaid } from '../utils/supabase-helpers';
import { BountyWithApplicants, Submission, BountyStatus } from '../utils/supabase-types';
import { formatCountdown, shortenAddress } from '../lib/utils';
import { useTransaction } from '../hooks/useTransaction';
import { useSnackbar } from 'notistack';
import { Clock, Users, Code, Trophy, ExternalLink, FileBox, AlertCircle, Lock, Unlock, RefreshCcw, Loader2 } from 'lucide-react';
import ChatRoom from '../components/ChatRoom';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumButton } from '../components/ui/PremiumButton';
import { GlassCard } from '../components/ui/GlassCard';
import gsap from 'gsap';

// Bounty Status Mapping to match contract.py
const STATUS_MAP: Record<number, string> = {
  0: 'open',
  1: 'active',
  2: 'submitted',
  3: 'winner_set',
  4: 'paid',
  5: 'disputed',
  6: 'refunded'
};

export default function BountyDetailPage() {
  const { bounty_id } = useParams<{ bounty_id: string }>();
  const id = Number(bounty_id);
  const { activeAddress } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const { applyBounty, selectWinnerAndPay, appClient } = useTransaction();

  const [bounty, setBounty] = useState<BountyWithApplicants | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isApplicant, setIsApplicant] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    let mounted = true;
    
    // 🚀 STABILITY GUARD: Only run the full sync if the ID or wallet changed
    // appClient is memoized but we want to be extra safe against re-init loops
    const init = async () => {
      if (isNaN(id)) {
        setLoading(false);
        return;
      }

      console.log(`📡 [Sync] Initializing bounty sequence: ${id}`);
      
      try {
        const data = await fetchBountyById(id);
        if (mounted && data) {
          setBounty(data);

          if (activeAddress) {
            setIsCreator(activeAddress === data.creator_wallet);
            const applied = await hasApplied(id, activeAddress);
            setIsApplicant(applied);

            if (activeAddress === data.creator_wallet || applied) {
              const subs = await getSubmissions(id, activeAddress);
              setSubmissions(subs);
            }

            // 🛡️ ON-CHAIN SYNC & SELF-HEALING
            try {
              // 🛡️ Call the generated camelCase method
              const result = await appClient.getBounty({ 
                args: { bountyId: BigInt(id) },
                sender: activeAddress
              });
              
              if (result && mounted) {
                const onChainStatus = STATUS_MAP[Number(result.paymentStatus)] as BountyStatus;
                
                // If on-chain says paid but DB doesn't, heal it
                if (onChainStatus === 'paid' && data.status !== 'paid') {
                  await markBountyPaid(id, activeAddress);
                  const subs2 = await getSubmissions(id, activeAddress);
                  setSubmissions(subs2);
                }

                setBounty(prev => prev ? { ...prev, status: onChainStatus } : prev);
              }
            } catch (checkErr) {
              console.warn("🛡️ On-chain sync failed - using cached DB state", checkErr);
            }
          }
        }
      } catch (err) {
        console.error("🔥 INIT ERROR:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [id, activeAddress]); // Removed appClient from deps to break loop, use activeAddress stability instead

  // GSAP Counter Animation for Reward
  useEffect(() => {
    if (bounty?.reward_algo) {
      const counter = { val: 0 };
      gsap.to(counter, {
        val: bounty.reward_algo,
        duration: 1.5,
        ease: 'expo.out',
        onUpdate: () => {
          const el = document.getElementById('reward-counter');
          if (el) el.innerText = counter.val.toFixed(2);
        }
      });
    }
  }, [bounty?.reward_algo]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mesh-stitch text-brand-text">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
        <div className="absolute inset-0 blur-xl bg-brand-primary/20 animate-pulse" />
      </div>
      <div className="mt-6 text-brand-outline font-display tracking-[0.2em] text-sm uppercase animate-pulse">
        Synchronizing_Bounty_Data...
      </div>
    </div>
  );
  
  if (!bounty) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mesh-stitch text-brand-text">
      <AlertCircle className="w-16 h-16 text-brand-error mb-4 opacity-50" />
      <div className="text-brand-error font-display text-2xl uppercase tracking-tighter">Bounty Not Found</div>
      <Link to="/explore" className="mt-8 text-brand-outline hover:text-brand-text transition-colors uppercase text-[10px] tracking-widest font-black underline underline-offset-8">
        Return_to_Nexus
      </Link>
    </div>
  );

  const { text: timeRemaining, isExpired } = formatCountdown(bounty.deadline);
  const isPaid = bounty.status === 'paid';
  const showRefund = isExpired && Number(bounty.status) < 2 && isCreator;

  const handleApply = async () => {
    if (!activeAddress) return;
    setActionLoading(true);
    try {
      enqueueSnackbar('Sealing smart contract application...', { variant: 'info' });
      const success = await applyBounty(id);
      if (success) {
        await callApplyBounty({ bounty_id: id, hunter_wallet: activeAddress });
        setIsApplicant(true);
        enqueueSnackbar('Successfully applied!', { variant: 'success' });
        setBounty(prev => prev ? { ...prev, applicant_count: prev.applicant_count + 1 } : prev);
      }
    } catch (e: any) {
      console.error("Apply Error:", e);
      enqueueSnackbar(e.message || 'Failed to apply', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayWinner = async (hunterWallet: string) => {
    setActionLoading(true);
    try {
      enqueueSnackbar('Executing Atomic Payout...', { variant: 'info' });
      const success = await selectWinnerAndPay(id, hunterWallet, hunterWallet, hunterWallet);
      if (success) {
        await markBountyPaid(id, activeAddress!);
        enqueueSnackbar('Bounty Released! Winner Paid.', { variant: 'success' });
        const updated = await fetchBountyById(id);
        if (updated) setBounty(updated);
        const subs = await getSubmissions(id, activeAddress!);
        setSubmissions(subs);
      }
    } catch (e: any) {
      enqueueSnackbar(e.message || 'Payment failed', { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-stitch pt-24 pb-12 px-4 text-brand-text">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT: Details & Chat */}
        <div className="lg:col-span-8 space-y-8">
          <GlassCard variant="liquid" className="relative overflow-hidden group p-8 md:p-14">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[100px] -mr-32 -mt-32" />
            
            {/* Status Badge */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.2)] ${
                isPaid 
                  ? 'bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary' 
                  : 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
              }`}>
                STATUS: {bounty.status}
              </span>
              <span className="text-brand-outline font-mono text-[10px] tracking-widest opacity-60 uppercase">
                IDENTIFIER: 0x{bounty.bounty_id.toString(16).padStart(4, '0')}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-display font-black mb-8 leading-[1.1] text-glow tracking-tight uppercase italic hero-title">
              {bounty.title}
            </h1>

            <div className="flex flex-wrap gap-8 text-[11px] font-black tracking-[0.2em] text-brand-outline mb-10 uppercase">
              <div className={`flex items-center gap-2 px-4 py-2 bg-brand-bg/40 rounded-xl border border-brand-outline-variant ${isExpired ? 'text-brand-error' : 'text-brand-text'}`}>
                <Clock className="w-4 h-4 opacity-70" />
                <span>{timeRemaining}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-brand-bg/40 rounded-xl border border-brand-outline-variant">
                <Users className="w-4 h-4 text-brand-tertiary opacity-70" />
                <span>{bounty.applicant_count} / {bounty.max_applicants} CONNECTED</span>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-brand-primary font-display font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-8 h-[1px] bg-brand-primary" /> MISSION_PARAMETERS
              </h3>
              <p className="text-slate-200 leading-relaxed text-xl font-light italic opacity-90">
                {bounty.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-brand-outline-variant">
              {bounty.tags.map(tag => (
                <span key={tag} className="px-4 py-1.5 bg-brand-surface-high border border-brand-outline-variant rounded-full text-[10px] font-black text-white uppercase tracking-wider hover:border-brand-primary transition-colors cursor-default shadow-sm shadow-brand-primary/10">
                  #{tag}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* Chat System */}
          {(isCreator || isApplicant) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <ChatRoom bountyId={bounty.bounty_id} />
            </motion.div>
          )}

          {/* Submissions Section: The Invisible Bounty History */}
          <AnimatePresence>
            {submissions.length > 0 && (
              <GlassCard variant="liquid" className="space-y-8 relative overflow-hidden p-8 md:p-12">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-tertiary/5 blur-[60px] -mr-16 -mt-16" />
                 
                <div className="flex items-center justify-between border-b border-brand-outline-variant pb-6">
                  <h3 className="text-xl font-display font-black flex items-center gap-3 text-glow uppercase italic tracking-wider">
                    <FileBox className="w-6 h-6 text-brand-primary" /> SUBMISSION_EVIDENCE
                  </h3>
                  {!isPaid && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-brand-tertiary px-4 py-1.5 bg-brand-tertiary/10 border border-brand-tertiary/20 rounded-full tracking-widest uppercase">
                      <Lock className="w-3 h-3" /> ENCRYPTED_HISTORY_LOCKED
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {submissions.map(sub => (
                    <div key={sub.id} className="p-6 bg-brand-surface-low/50 border border-brand-outline-variant rounded-3xl flex flex-col md:flex-row justify-between items-center gap-8 hover:bg-brand-surface-low transition-all group">
                      <div className="flex-1 space-y-4 w-full">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(173,198,255,0.8)]" />
                           <p className="font-mono text-[10px] text-brand-outline uppercase tracking-widest">
                             NODE_ADDRESS: {shortenAddress(sub.hunter_wallet)}
                           </p>
                        </div>
                        
                        <div className="space-y-4 ml-5">
                          <div className="flex items-center gap-4 group/link">
                            <ExternalLink className="w-4 h-4 text-blue-400 group-hover/link:opacity-100 transition-opacity" />
                            <a href={sub.deploy_link} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-400 hover:text-white transition-colors underline underline-offset-4 decoration-blue-400/30 truncate max-w-full font-mono">
                              {sub.deploy_link}
                            </a>
                          </div>

                          <div className={`relative group/code`}>
                            {isPaid ? (
                              <div className="flex items-center gap-4">
                                <Code className="w-4 h-4 text-brand-secondary transition-opacity" />
                                <span className={`text-sm font-mono tracking-tight text-brand-secondary`}>
                                  {sub.github_link || 'GITHUB_REPOSITORY'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-slate-900/80 border border-brand-outline-variant/50 rounded-xl max-w-sm">
                                <Lock className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-mono tracking-tight text-slate-300 font-bold">
                                  [ENCRYPTED_PAYLOAD_LOCKED]
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isCreator && (bounty.status === 'submitted' || bounty.status === 'active') && (
                        <PremiumButton
                          onClick={() => handlePayWinner(sub.hunter_wallet)}
                          isLoading={actionLoading}
                          className="w-full md:w-auto px-8"
                        >
                          RELEASE_ESCROW
                        </PremiumButton>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Static Action Panel */}
        <div className="lg:col-span-4 sticky top-24 space-y-6">
          <GlassCard variant="liquid" className="text-center p-10 md:p-12">
            <p className="text-brand-text/70 text-[10px] font-black uppercase tracking-[0.3em] mb-4">ESCROW_LIQUIDITY</p>
            <div className="text-6xl font-display font-black text-brand-text mb-4 flex items-center justify-center gap-3 italic">
              <span id="reward-counter">0</span>
              <span className="text-xs opacity-30 not-italic font-black tracking-widest">ALGO</span>
            </div>
            
            <div className="mt-8 pt-8 border-t border-brand-outline-variant space-y-6">
              <div className="flex justify-between text-[10px] font-black tracking-widest text-brand-outline uppercase">
                <span>VESTING_MODEL</span>
                <span className="text-brand-primary text-glow font-mono">{bounty.payout_split.join(' / ')}%</span>
              </div>
              <div className="h-1.5 w-full bg-brand-surface-high rounded-full overflow-hidden flex shadow-inner">
                 {bounty.payout_split.map((s, i) => (
                   <div key={i} style={{ width: `${s}%` }} className={`h-full border-r border-brand-bg/20 ${i === 0 ? 'bg-brand-primary' : i === 1 ? 'bg-brand-secondary' : 'bg-brand-tertiary'}`} />
                 ))}
              </div>
            </div>

            <div className="mt-10">
              {!activeAddress ? (
                <div className="p-6 bg-brand-tertiary/5 rounded-3xl text-brand-tertiary text-[10px] font-black tracking-widest border border-brand-tertiary/10 uppercase italic">
                  Critical: Secure Wallet Connection Required
                </div>
              ) : isCreator ? (
                <div className="space-y-4">
                  <div className="p-6 bg-brand-primary/10 rounded-3xl text-brand-primary text-[10px] font-black tracking-widest border border-brand-primary/20 flex flex-col items-center gap-3 uppercase">
                    <Unlock className="w-6 h-6 animate-bounce" />
                    <span>PROTOCOL_CURATOR_ACTIVE</span>
                  </div>
                  
                  {showRefund && (
                    <PremiumButton variant="secondary" className="w-full border-brand-error/20 text-brand-error hover:bg-brand-error/10 text-xs italic">
                      <RefreshCcw className="w-4 h-4 mr-2" /> RECLAIM_ESCROW
                    </PremiumButton>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!isApplicant && (
                    <PremiumButton
                      onClick={handleApply}
                      disabled={actionLoading || isExpired || (bounty.status !== 'open' && bounty.status !== 'active')}
                      className="w-full py-8 text-xl tracking-tighter uppercase italic shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.3)]"
                      isLoading={actionLoading}
                    >
                      JOIN_CAMPAIGN
                    </PremiumButton>
                  )}

                  {isApplicant && !submissions.some(s => s.hunter_wallet === activeAddress) && (
                    <Link to={`/bounty/${id}/submit`}>
                      <PremiumButton className="w-full py-8 text-xl tracking-tighter uppercase italic" variant="secondary">
                        SUBMIT_PROOF
                      </PremiumButton>
                    </Link>
                  )}

                  {submissions.some(s => s.hunter_wallet === activeAddress) && (
                    <div className="p-6 bg-brand-secondary/10 rounded-3xl text-brand-secondary text-[10px] font-black tracking-widest border border-brand-secondary/20 flex items-center justify-center gap-3 uppercase shadow-lg">
                      <Trophy className="w-5 h-5 text-glow-secondary" /> PROOF_LOCKED_ON_CHAIN
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          <div className="p-6 rounded-3xl bg-brand-bg/40 border border-brand-outline-variant flex gap-4 items-center">
             <div className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse" />
             <p className="text-[9px] text-brand-outline uppercase tracking-widest font-black leading-loose">
               Safety_Audit: Escrow protected by Algorand AVM. Disputed funds subject to protocol arbitration.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}
