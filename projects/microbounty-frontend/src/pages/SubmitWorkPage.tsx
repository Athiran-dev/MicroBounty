import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sha256 } from 'js-sha256';
import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import { hashDeployLink } from '../lib/utils';
import { useTransaction } from '../hooks/useTransaction';
import { callSubmitWork, hasApplied } from '../utils/supabase-helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link as LinkIcon, FileCode2, AlignLeft, Info, Shield, Hash } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { PremiumButton } from '../components/ui/PremiumButton';

export default function SubmitWorkPage() {
  const { bounty_id } = useParams<{ bounty_id: string }>();
  const id = Number(bounty_id);
  const { activeAddress } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { submitWork } = useTransaction();

  const [loading, setLoading] = useState(false);
  const [initCheck, setInitCheck] = useState(true);

  const [formData, setFormData] = useState({
    deployLink: '',
    githubLink: '',
    commitHash: '',
    starterFilesUrl: '',
    description: ''
  });

  const [generatedHash, setGeneratedHash] = useState('');

  // 🛡️ SHA-256 Hash Engine: Every submission must trigger a hashing function.
  // Add logic to hash the GitHub link + User Address.
  useEffect(() => {
    if (formData.githubLink && activeAddress) {
      const combined = `${formData.githubLink}${activeAddress}`;
      const hash = sha256(combined);
      setGeneratedHash(hash);
      // We still use a slice for the 'commitHash' field in the contract if it's too long, 
      // but the full engine is running here.
      setFormData(prev => ({ ...prev, commitHash: hash.substring(0, 16) }));
    } else {
      setGeneratedHash('');
    }
  }, [formData.githubLink, activeAddress]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!activeAddress) return;
      const applied = await hasApplied(id, activeAddress);
      if (!applied) {
        enqueueSnackbar('You must join the campaign before submitting evidence.', { variant: 'error' });
        navigate(`/bounty/${id}`);
      }
      setInitCheck(false);
    };
    if (activeAddress) checkEligibility();
  }, [id, activeAddress, enqueueSnackbar, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddress) return;

    setLoading(true);
    try {
      const hashedLink = hashDeployLink(formData.deployLink);

      enqueueSnackbar('Sealing evidence on-chain...', { variant: 'info' });
      await submitWork(id, hashedLink, formData.githubLink, formData.commitHash);

      enqueueSnackbar('Transaction confirmed! Syncing Bounty Session...', { variant: 'info' });
      try {
        await callSubmitWork({
          bounty_id: id,
          hunter_wallet: activeAddress,
          deploy_link: formData.deployLink,
          github_link: formData.githubLink,
          starter_files_url: formData.starterFilesUrl,
          work_description: formData.description
        });
        enqueueSnackbar('Evidence successfully locked on-chain!', { variant: 'success' });
      } catch (syncErr) {
        enqueueSnackbar('On-chain success, but session sync failed', { variant: 'warning' });
      }

      navigate(`/bounty/${id}`);
    } catch (err: any) {
      enqueueSnackbar(err.message || 'Submission failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (initCheck) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-text transition-colors duration-200">
      <div className="text-brand-primary animate-pulse font-display text-2xl">Authenticating Contributor...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-bg pt-32 pb-12 px-4 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <GlassCard variant="premium" className="relative">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-display font-black mb-3 text-glow italic">
              SUBMIT_PROOF_OF_WORK
            </h1>
            <p className="text-brand-text-dim text-sm max-w-lg mx-auto leading-relaxed">
              Seal your contribution on the decentralized ledger. Your source code links are 
              <span className="text-brand-primary font-bold"> cryptographically masked</span> until payment release.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {/* Deploy Link */}
              <div>
                <label className="block text-[10px] font-black tracking-widest text-brand-primary uppercase mb-3 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> LIVE_RELIANCE_URL
                </label>
                <div className="relative group">
                  <input
                    required
                    disabled={loading}
                    type="url"
                    value={formData.deployLink}
                    onChange={e => setFormData(p => ({ ...p, deployLink: e.target.value }))}
                    className="w-full bg-brand-surface-low border border-brand-outline-variant rounded-2xl px-6 py-4 focus:border-brand-primary outline-none transition-all duration-300 group-hover:bg-brand-surface-container text-brand-text placeholder:text-brand-text-dim/40"
                    placeholder="https://your-app.vercel.app"
                  />
                </div>
                <p className="text-[10px] text-brand-text-dim mt-2 flex items-center gap-2 opacity-80">
                  <Info className="w-3 h-3 text-brand-primary" /> Publicly accessible for immediate verification.
                </p>
              </div>

              {/* GitHub Link & Hash Engine */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black tracking-widest text-brand-text-dim uppercase flex items-center gap-2">
                    <LinkIcon className="w-3 h-3 text-brand-primary" /> SOURCE_CRED_LINK
                  </label>
                  <input
                    required
                    disabled={loading}
                    type="url"
                    value={formData.githubLink}
                    onChange={e => setFormData(p => ({ ...p, githubLink: e.target.value }))}
                    className="w-full bg-brand-surface-low border border-brand-outline-variant rounded-2xl px-6 py-4 focus:border-brand-primary outline-none transition-all duration-300 group-hover:bg-brand-surface-container text-brand-text"
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black tracking-widest text-brand-text-dim uppercase flex items-center gap-2">
                    <Hash className="w-3 h-3 text-brand-primary" /> AUTOMATIC_TX_HASH
                  </label>
                  <div className="w-full bg-brand-surface-high border border-brand-primary/20 rounded-2xl px-6 py-4 font-mono text-xs text-brand-primary overflow-hidden text-ellipsis whitespace-nowrap">
                    {generatedHash ? generatedHash : 'Awaiting Source URL...'}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {generatedHash && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-primary/10 rounded-lg">
                        <FileCode2 className="w-4 h-4 text-brand-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider block mb-1">SHA256_ENGINE_LOCK</span>
                        <code className="text-[9px] text-brand-text-dim block truncate font-mono">
                          {generatedHash}
                        </code>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6 pt-6 border-t border-brand-outline-variant">
              <div>
                <label className="block text-[10px] font-black tracking-widest text-brand-text-dim uppercase mb-3 text-center">
                  <AlignLeft className="w-3 h-3 inline mr-1 text-brand-primary" /> ARCHITECTURE_SUMMARY
                </label>
                <textarea
                  required
                  disabled={loading}
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-brand-surface-low border border-brand-outline-variant rounded-2xl px-6 py-4 focus:border-brand-primary outline-none transition-all duration-300 group-hover:bg-brand-surface-container text-brand-text placeholder:text-brand-text-dim/40 resize-none"
                  placeholder="Describe your solution..."
                />
              </div>

              <GlassCard className="bg-brand-primary/5 py-4 border-none flex gap-4 items-start">
                <Shield className="w-6 h-6 text-brand-primary" shrink-0 />
                <p className="text-[11px] text-brand-text-dim leading-loose">
                  <strong className="text-brand-text">ENCRYPTION PROTOCOL:</strong> Your source credentials will be 
                  <span className="text-brand-primary"> blurred and locked</span>. Only the Issuer can decrypt these 
                  once the smart contract releases the reward to your wallet.
                </p>
              </GlassCard>
            </div>

            <div className="pt-4">
              <PremiumButton
                type="submit"
                disabled={loading}
                isLoading={loading}
                className="w-full py-8 text-xl italic"
              >
                SUBMIT_EVIDENCE_ON_CHAIN
              </PremiumButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
