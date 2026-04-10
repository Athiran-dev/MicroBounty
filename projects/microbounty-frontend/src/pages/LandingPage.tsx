import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, Shield, Zap, Users, Search,
  Settings, Globe, Laptop, Code, Type,
  MessageSquare, Layout, CheckCircle2,
  Clock, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumButton } from '../components/ui/PremiumButton';
import { GlassCard } from '../components/ui/GlassCard';
import gsap from 'gsap';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subtle parallax effect for floating cards
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.floating-card');
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;

      cards.forEach((card, i) => {
        const factor = (i + 1) * 0.5;
        gsap.to(card, {
          x: x * factor,
          y: y * factor,
          duration: 1,
          ease: 'power2.out'
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-mesh-stitch selection:bg-brand-primary selection:text-brand-bg text-brand-text">

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-primary/5 blur-[150px] rounded-full pointer-events-none -mr-96 -mt-96" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none -ml-40 -mb-40" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Left Content */}
          <div className="max-w-2xl pt-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-black text-[9px] tracking-[0.2em] mb-8 uppercase"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
              Network Live on Algorand
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-display font-black tracking-tight leading-[0.9] mb-8 uppercase italic hero-title">
              Trustless <br /> Bounties. <br />
              <span className="text-brand-primary">Instant Payouts.</span>
            </h1>

            <p className="text-lg md:text-xl text-brand-text-dim max-w-lg mb-12 leading-relaxed italic hero-subtitle">
              Lock funds, get work done, pay automatically — no middlemen. The future of decentralized micro-tasks is here.
            </p>

            <div className="flex flex-wrap gap-6 items-center">
              <PremiumButton className="px-10 py-5 text-sm font-black italic">
                Connect Wallet
              </PremiumButton>
              <Link to="/explore">
                <PremiumButton variant="secondary" className="px-10 py-5 text-sm font-black italic bg-brand-surface-high/50">
                  Explore Bounties
                </PremiumButton>
              </Link>
            </div>

            {/* Stats Row */}
            <div className="mt-20 flex gap-12 border-t border-brand-outline-variant/20 pt-10">
              <div>
                <p className="text-3xl font-display font-black text-brand-text italic leading-none">1.2M+</p>
                <p className="text-[10px] text-brand-text-dim uppercase tracking-widest mt-2 font-bold opacity-60">Algo Paid</p>
              </div>
              <div>
                <p className="text-3xl font-display font-black text-brand-text italic leading-none">14.5k</p>
                <p className="text-[10px] text-brand-text-dim uppercase tracking-widest mt-2 font-bold opacity-60">Bounties Filled</p>
              </div>
            </div>
          </div>

          {/* Right Content: Floating Interactive Elements */}
          <div className="relative h-[600px] hidden lg:block">
            {/* Card 1: Audit */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="floating-card absolute top-10 right-0 w-[420px]"
            >
              <GlassCard variant="premium" className="bg-[#0f172a]/80 backdrop-blur-xl border-white/5 p-8 shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center">
                    <Layout className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="px-3 py-1 rounded bg-brand-secondary/10 border border-brand-secondary/30 text-brand-secondary text-[8px] font-black tracking-widest uppercase">
                    Open
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-display font-black text-white italic uppercase tracking-tight">Smart Contract Audit</h4>
                  <p className="text-xs text-brand-text-dim italic mt-2 line-clamp-2">Review the latest micro-escrow logic for vulnerabilities and optimization parameters.</p>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[8px] text-brand-text-dim uppercase tracking-widest font-bold opacity-60">Reward</p>
                    <p className="text-2xl font-display font-black text-white italic leading-none">500 ALGO</p>
                  </div>
                  <PremiumButton className="px-4 py-2 text-[10px]">Apply</PremiumButton>
                </div>
              </GlassCard>
            </motion.div>

            {/* Card 2: Design */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="floating-card absolute top-[280px] left-0 w-[380px]"
            >
              <GlassCard variant="premium" className="bg-[#1e293b]/60 backdrop-blur-xl border-white/5 p-8 shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-brand-tertiary/10 border border-brand-tertiary/30 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-brand-tertiary" />
                  </div>
                  <div className="px-3 py-1 rounded bg-brand-tertiary/10 border border-brand-tertiary/30 text-brand-tertiary text-[8px] font-black tracking-widest uppercase">
                    Voting
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-display font-black text-white italic uppercase tracking-tight leading-tight">DEX Logo Redesign</h4>
                  <div className="flex gap-4 mt-3">
                    <div className="space-y-1">
                      <p className="text-[7px] text-brand-text-dim uppercase tracking-widest font-bold opacity-40">Reward</p>
                      <p className="text-lg font-display font-black text-white italic leading-none text-glow">120 ALGO</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Contributor Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="floating-card absolute bottom-10 right-10 w-[320px]"
            >
              <div className="bg-[#0f172a]/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center overflow-hidden">
                  <Users className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[8px] font-mono text-brand-primary font-bold">0x...1E2D</p>
                    <p className="text-[7px] text-brand-text-dim uppercase font-bold tracking-widest">Contributor</p>
                  </div>
                  <p className="text-[10px] text-brand-text-dim italic leading-tight line-clamp-1">"Claimed the UI Bounty. Submitting PR soon!"</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Section: Engineered for Decentralized Growth */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter text-brand-text hero-title">
              Engineered for Decentralized Growth
            </h2>
            <p className="text-brand-text-dim max-w-2xl mx-auto italic hero-subtitle">
              MicroBounty is more than a job board. It's a protocol for human capital allocation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[320px]">
            {/* 1. Atomic Escrows */}
            <div className="md:col-span-1 lg:col-span-8 flex flex-col group h-full">
              <GlassCard variant="premium" className="h-full flex flex-col p-12 bg-brand-surface-container hover:border-brand-primary/50 transition-all duration-500 overflow-hidden relative shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[80px] -mr-32 -mt-32 rounded-full group-hover:bg-brand-primary/10 transition-all" />
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center mb-8 relative z-10">
                  <Shield className="w-6 h-6 text-brand-primary" />
                </div>
                <h3 className="text-3xl font-display font-black text-brand-text uppercase italic mb-6 relative z-10">Atomic Escrows</h3>
                <p className="text-brand-text-dim max-w-sm italic relative z-10 text-lg">
                  Funds are locked in a programmatic escrow that only releases upon consensus or verifiable completion. No more ghosting.
                </p>
              </GlassCard>
            </div>

            {/* 2. Instant Settlement */}
            <div className="md:col-span-1 lg:col-span-4 h-full">
              <GlassCard variant="premium" className="h-full flex flex-col p-12 bg-gradient-to-br from-brand-surface-container to-brand-primary/20 border-brand-primary/20 justify-end overflow-hidden relative shadow-xl group">
                {/* Visual Pattern Representing Hardware */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none p-4">
                  <div className="grid grid-cols-10 gap-2 w-full h-full">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div key={i} className="aspect-square border border-brand-primary/30 rounded-sm" />
                    ))}
                  </div>
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-display font-black text-brand-text uppercase italic mb-3">Instant Settlement</h3>
                  <p className="text-xs text-brand-text-dim italic leading-relaxed mb-6">
                    Leveraging Algorand's 3.3s finality for lightning fast global payments. No transaction is too small.
                  </p>
                  <div className="text-[9px] font-black text-brand-secondary bg-brand-secondary/10 border border-brand-secondary/30 px-3 py-1.5 rounded-full inline-block tracking-widest uppercase">
                    Powered by Pure PoS
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* 3. Community Governance */}
            <div className="md:col-span-1 lg:col-span-4 h-full">
              <GlassCard variant="premium" className="h-full flex flex-col p-12 bg-brand-surface-container items-center justify-center text-center space-y-6 group shadow-xl">
                <div className="w-16 h-16 rounded-full bg-brand-tertiary/10 border border-brand-tertiary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-brand-tertiary" />
                </div>
                <h3 className="text-2xl font-display font-black text-brand-text uppercase italic">Community Governance</h3>
                <p className="text-xs text-brand-text-dim italic">
                  Disputes are resolved by a jury of token holders, ensuring fairness through decentralized incentives.
                </p>
                <Link to="/docs" className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] underline underline-offset-8 decoration-1">
                  Read the Docs
                </Link>
              </GlassCard>
            </div>

            {/* 4. Start Micro-Earning */}
            <div className="md:col-span-1 lg:col-span-8 h-full">
              <GlassCard variant="premium" className="h-full bg-brand-surface-container flex flex-col md:flex-row p-12 gap-12 items-center shadow-xl">
                <div className="flex-1 space-y-8">
                  <h3 className="text-3xl font-display font-black text-brand-text uppercase italic">Start Micro-Earning</h3>
                  <p className="text-brand-text-dim italic text-sm">
                    From translation to code review, there's a micro-bounty for every skill set. Connect your wallet and start contributing today.
                  </p>
                  <PremiumButton className="px-8 py-4 text-xs font-black italic rounded-full inline-flex items-center gap-3">
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </PremiumButton>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Code, color: "text-brand-primary" },
                    { icon: Globe, color: "text-brand-secondary" },
                    { icon: Laptop, color: "text-brand-tertiary" },
                    { icon: Settings, color: "text-brand-outline" }
                  ].map((item, i) => (
                    <div key={i} className="w-16 h-16 rounded-2xl bg-brand-surface-high border border-brand-outline-variant flex items-center justify-center hover:border-brand-primary transition-colors cursor-pointer group shadow-lg">
                      <item.icon className={`w-6 h-6 ${item.color} group-hover:scale-110 transition-transform`} />
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Join the Ethereal Frontier (Newsletter/CTA) */}
      <section className="py-40 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-brand-primary/5 blur-[200px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-10 relative z-10">
          <h2 className="text-5xl md:text-7xl font-display font-black uppercase italic tracking-tighter text-brand-text hero-title">
            Join the Ethereal Frontier
          </h2>
          <p className="text-brand-text-dim italic max-w-xl mx-auto hero-subtitle">
            Be the first to hear about new high-value bounties and protocol updates.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 bg-brand-bg/60 border border-brand-outline-variant rounded-full px-8 py-5 text-sm font-light italic outline-none focus:border-brand-primary transition-all text-brand-text"
            />
            <PremiumButton className="px-10 py-5 text-sm font-black italic rounded-full shadow-lg">
              Join Waitlist
            </PremiumButton>
          </div>
        </div>
      </section>

      {/* Standardized 3-column Footer */}
      <footer className="border-t border-brand-outline-variant/30 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-16">
          <div className="space-y-6 text-center md:text-left">
            <span className="text-2xl font-display font-black tracking-tighter uppercase italic text-brand-text">
              MICRO<span className="text-brand-primary">BOUNTY</span>
            </span>
            <p className="text-[10px] text-brand-text-dim italic leading-loose opacity-60">
              © 2026 MicroBounty. Curating the Ethereal<br />Frontier.
            </p>
          </div>

          <div className="flex gap-16 text-center md:text-left">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-text-dim uppercase tracking-widest opacity-40">Resources</h4>
              <nav className="flex flex-col gap-3">
                <Link to="/docs" className="text-[11px] font-bold text-brand-text-dim hover:text-brand-primary transition-colors">Documentation</Link>
                <Link to="/privacy" className="text-[11px] font-bold text-brand-text-dim hover:text-brand-primary transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-[11px] font-bold text-brand-text-dim hover:text-brand-primary transition-colors">Terms of Service</Link>
              </nav>
            </div>
          </div>

          <div className="flex gap-8 items-center">
            <a href="https://discord.gg" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-brand-text-dim hover:text-brand-primary transition-colors uppercase tracking-widest">
              <MessageSquare className="w-4 h-4" /> Discord
            </a>
            <a href="https://github.com/Aman-81/MicroBounty" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black text-brand-text-dim hover:text-brand-primary transition-colors uppercase tracking-widest">
              <Code className="w-4 h-4" /> Github
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
