import { Clock, Users, ArrowUpRight, Zap, Target, Shield, Binary } from 'lucide-react';
import { BountyWithApplicants } from '../utils/supabase-types';
import { formatCountdown } from '../lib/utils';
import { Link } from 'react-router-dom';
import { GlassCard } from './ui/GlassCard';

interface BountyCardProps {
  bounty: BountyWithApplicants;
}

export default function BountyCard({ bounty }: BountyCardProps) {
  const { text: timeRemaining, isExpired } = formatCountdown(bounty.deadline);
  
  const statusConfig = {
    open: { 
      label: 'OPEN', 
      color: 'text-[#10B981]', 
      bg: 'bg-[#10B981]/10', 
      border: 'border-[#10B981]/20', 
    },
    active: { 
      label: 'IN PROGRESS', 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10', 
      border: 'border-brand-primary/20', 
    },
    submitted: { 
      label: 'REVIEWING', 
      color: 'text-brand-tertiary', 
      bg: 'bg-brand-tertiary/10', 
      border: 'border-brand-tertiary/20', 
    },
    paid: { 
      label: 'COMPLETED', 
      color: 'text-brand-text/50', 
      bg: 'bg-brand-text/5', 
      border: 'border-brand-text/10', 
    },
    refunded: { 
      label: 'REFUNDED', 
      color: 'text-brand-error', 
      bg: 'bg-brand-error/10', 
      border: 'border-brand-error/30', 
    },
    disputed: { 
      label: 'DISPUTED', 
      color: 'text-red-500', 
      bg: 'bg-red-500/10', 
      border: 'border-red-500/30', 
    }
  };

  const currentStatus = statusConfig[bounty.status as keyof typeof statusConfig] || statusConfig.open;

  // Calculate percentage of applicants filled as a placeholder for progress
  const progressPercent = Math.min((bounty.applicant_count / bounty.max_applicants) * 100, 100);

  return (
    <Link to={`/bounty/${bounty.bounty_id}`} className="block group">
      <GlassCard 
        variant="premium" 
        className="h-full flex flex-col p-8 transition-all duration-500 group-hover:border-brand-primary/40 relative overflow-hidden bg-brand-surface/40"
      >
        {/* Card Header: Reward & Status */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-brand-text-dim uppercase tracking-[0.2em] mb-1">REWARD</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-display font-black text-brand-text tracking-tight italic">
                {bounty.reward_algo.toLocaleString()}
              </span>
              <span className="text-[10px] font-black text-brand-outline-variant uppercase">ALGO</span>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-md border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color} text-[8px] font-black tracking-widest uppercase`}>
            {currentStatus.label}
          </div>
        </div>

        {/* Content Area */}
        <div className="mb-6 h-[100px] flex flex-col justify-center">
          <h3 className="text-xl font-display font-bold leading-snug group-hover:text-brand-primary transition-colors line-clamp-2 mb-2">
            {bounty.title}
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 font-light">
            {bounty.description}
          </p>
        </div>

        {/* Thematic Progress Bar */}
        <div className="mb-8 pt-4 border-t border-white/5">
           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
             <div 
               className="h-full bg-brand-primary/40 shadow-[0_0_12px_rgba(var(--brand-primary-rgb),0.3)] transition-all duration-1000 ease-out"
               style={{ width: `${progressPercent}%` }}
             />
           </div>
        </div>

        {/* Card Footer: Metrics */}
        <div className="flex items-center justify-between text-[11px] font-medium text-brand-text-dim mt-auto">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span>{timeRemaining}</span>
          </div>
          <div className="flex items-center gap-2">
             <Users className="w-3.5 h-3.5 opacity-60" />
             <span>{bounty.applicant_count} Applicants</span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
