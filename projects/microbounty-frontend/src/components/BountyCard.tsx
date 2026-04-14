import { Clock, Users, ArrowUpRight, Zap, Target, Shield, Binary } from 'lucide-react';
import { BountyWithApplicants } from '../utils/supabase-types';
import { formatCountdown } from '../lib/utils';
import { Link } from 'react-router-dom';

interface BountyCardProps {
  bounty: BountyWithApplicants;
}

export default function BountyCard({ bounty }: BountyCardProps) {
  const { text: timeRemaining, isExpired } = formatCountdown(bounty.deadline);
  
  const statusConfig = {
    open: { 
      label: 'OPEN', 
      color: 'text-[#10B981]', 
      bg: 'bg-[#D1FAE5] dark:bg-[#10B981]/10', 
      border: 'border-[#10B981]/20', 
    },
    active: { 
      label: 'IN PROGRESS', 
      color: 'text-[#6D28D9] dark:text-[#C4A1FF]', 
      bg: 'bg-[#F3E8FF] dark:bg-[#6D28D9]/10', 
      border: 'border-[#6D28D9]/20', 
    },
    submitted: { 
      label: 'REVIEWING', 
      color: 'text-amber-600 dark:text-amber-400', 
      bg: 'bg-amber-50 dark:bg-amber-400/10', 
      border: 'border-amber-400/20', 
    },
    paid: { 
      label: 'COMPLETED', 
      color: 'text-gray-500 dark:text-gray-400', 
      bg: 'bg-gray-100 dark:bg-gray-400/10', 
      border: 'border-gray-200 dark:border-gray-400/20', 
    },
    refunded: { 
      label: 'REFUNDED', 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-400/10', 
      border: 'border-red-400/30', 
    },
    disputed: { 
      label: 'DISPUTED', 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-400/10', 
      border: 'border-red-400/30', 
    }
  };

  const currentStatus = statusConfig[bounty.status as keyof typeof statusConfig] || statusConfig.open;

  // Calculate percentage of applicants filled as a placeholder for progress
  const progressPercent = Math.min((bounty.applicant_count / bounty.max_applicants) * 100, 100);

  return (
    <Link to={`/bounty/${bounty.bounty_id}`} className="block group">
      <div className="glass-card rounded-[2rem] h-full flex flex-col p-8 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-[#6D28D9]/10 group-hover:border-[#6D28D9] dark:group-hover:border-[#C4A1FF] relative overflow-hidden">
        
        {/* Card Header: Reward & Status */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] uppercase tracking-[0.2em] mb-1">REWARD</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {bounty.reward_algo.toLocaleString()}
              </span>
              <span className="text-[10px] font-black text-gray-400 dark:text-[#64748B] uppercase">ALGO</span>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color} text-[8px] font-black tracking-widest uppercase`}>
            {currentStatus.label}
          </div>
        </div>

        {/* Content Area */}
        <div className="mb-6 h-[100px] flex flex-col justify-center">
          <h3 className="text-xl font-bold leading-snug group-hover:text-[#6D28D9] dark:group-hover:text-[#C4A1FF] transition-colors line-clamp-2 mb-2">
            {bounty.title}
          </h3>
          <p className="text-gray-500 dark:text-[#94A3B8] text-sm leading-relaxed line-clamp-2 font-medium">
            {bounty.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 pt-4 border-t border-gray-100 dark:border-[#262A36]">
           <div className="h-2 w-full bg-gray-100 dark:bg-[#262A36] rounded-full overflow-hidden">
             <div 
               className="h-full bg-[#6D28D9] dark:bg-[#C4A1FF] transition-all duration-1000 ease-out"
               style={{ width: `${progressPercent}%` }}
             />
           </div>
        </div>

        {/* Card Footer: Metrics */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-400 dark:text-[#64748B] mt-auto uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeRemaining}</span>
          </div>
          <div className="flex items-center gap-2">
             <Users className="w-3.5 h-3.5" />
             <span>{bounty.applicant_count} Applicants</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
