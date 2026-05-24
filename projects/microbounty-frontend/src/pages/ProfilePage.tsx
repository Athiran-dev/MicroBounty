import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSupabase } from '../utils/supabaseClient';
import { Bounty, Application } from '../utils/supabase-types';
import { shortenAddress } from '../lib/utils';
import BountyCard from '../components/BountyCard';
import { motion } from 'framer-motion';
import { Award, Briefcase, FileCode2, Bot, Trash2, Calendar, Code, Sparkles, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { useWallet } from '@txnlab/use-wallet-react';

export default function ProfilePage() {
  const { wallet_address: paramAddress } = useParams<{ wallet_address: string }>();
  const { activeAddress } = useWallet();
  const wallet_address = paramAddress || activeAddress;
  
  const isConnect = !wallet_address;
  
  const [activeTab, setActiveTab] = useState<'created' | 'applied' | 'ai-tasks'>('created');
  const [createdBounties, setCreated] = useState<Bounty[]>([]);
  const [appliedBounties, setApplied] = useState<(Bounty & { applied_at: string })[]>([]);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
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

        // Fetch AI Agent tasks
        const { data: tasks } = await supabase
          .from('ai_tasks')
          .select('*, ai_agents ( name )')
          .eq('client_wallet', wallet_address)
          .order('created_at', { ascending: false });

        if (tasks) setAiTasks(tasks);
      } catch (err) {
        console.error("Profile fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [wallet_address, isConnect]);

  const handleDeleteTask = async (taskId: number | string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this AI task record? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ai_tasks')
        .delete()
        .eq('task_id', taskId);

      if (error) {
        alert(`Failed to delete task: ${error.message}`);
      } else {
        setAiTasks(prev => prev.filter(t => t.task_id !== taskId));
      }
    } catch (err: any) {
      alert(`Error deleting task: ${err.message}`);
    }
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

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
            <div className="flex items-center gap-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] px-4 py-2 rounded-xl">
              <Award className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Earned</p>
                <p className="font-black text-lg text-emerald-500">{algoEarnedApprox.toFixed(2)} ALGO</p>
              </div>
            </div>
            <Link to="/ai-tasks/my-agents" className="flex items-center gap-2 bg-white dark:bg-[#15171E] border border-[#6D28D9]/30 px-4 py-2 rounded-xl hover:bg-[#F3E8FF] transition-colors">
              <Bot className="w-5 h-5 text-[#6D28D9]" />
              <div>
                <p className="text-[10px] text-[#6D28D9] uppercase tracking-widest font-bold">AI Agents</p>
                <p className="font-black text-lg text-gray-900 dark:text-white">Manage</p>
              </div>
            </Link>
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
        <button 
          onClick={() => setActiveTab('ai-tasks')}
          className={`pb-4 px-2 font-bold text-lg transition-colors relative ${activeTab === 'ai-tasks' ? 'text-brand-text' : 'text-brand-text-dim hover:text-brand-text'}`}
        >
          AI Tasks History
          {activeTab === 'ai-tasks' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9]" />}
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
      ) : activeTab === 'applied' ? (
        appliedBounties.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appliedBounties.map(b => (
              <BountyCard key={b.id} bounty={{...b, applicant_count: 0}} />
            ))}
          </div>
        ) : (
          <p className="text-brand-text-dim">No bounties applied for yet.</p>
        )
      ) : (
        aiTasks.length > 0 ? (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {aiTasks.map(task => {
              // Parse input prompt
              let promptText = "";
              try {
                const parsed = typeof task.input_data === 'string' ? JSON.parse(task.input_data) : task.input_data;
                promptText = parsed.prompt || JSON.stringify(task.input_data);
              } catch {
                promptText = String(task.input_data);
              }

              // Parse agent output
              let outputText = "";
              let isJson = false;
              if (task.output_data) {
                try {
                  const parsed = typeof task.output_data === 'string' ? JSON.parse(task.output_data) : task.output_data;
                  outputText = JSON.stringify(parsed, null, 2);
                  isJson = true;
                } catch {
                  outputText = String(task.output_data);
                }
              }

              const isExpanded = !!expandedTasks[task.id];
              const agentName = task.ai_agents?.name || `Agent ${task.agent_id}`;

              // Determine status colors/labels
              let statusLabel = "Pending";
              let statusBg = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
              if (task.status === 'paid' || task.status === 'judge_passed') {
                statusLabel = "Passed & Paid";
                statusBg = "bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/20";
              } else if (task.status === 'refunded' || task.status === 'judge_failed') {
                statusLabel = "Quality Failed (Refunded)";
                statusBg = "bg-red-500/10 text-red-500 border border-red-500/20";
              } else if (task.status === 'processing') {
                statusLabel = "Processing";
                statusBg = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
              }

              return (
                <div key={task.id} className="glass p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-[#6D28D9]/40 group text-left">
                  {/* Neon Glow on Hover */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#6D28D9]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#6D28D9]/10 transition-colors" />

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-outline-variant">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[#94A3B8]">TASK #{task.task_id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Bot className="w-5 h-5 text-[#6D28D9]" /> {agentName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider font-bold">Lock Payment</p>
                        <p className="text-sm font-black font-mono text-[#C4A1FF]">{task.payment_amount_algo} ALGO</p>
                      </div>

                      <button 
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        title="Delete task record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Prompts / Details */}
                  <div className="space-y-4">
                    {/* Prompt Box */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5" /> Prompt / Input
                      </p>
                      <div className="bg-white/5 dark:bg-[#1A1D24] border border-brand-outline-variant rounded-xl p-3.5 text-sm font-mono text-[#D1D5DB] break-words whitespace-pre-wrap">
                        {promptText}
                      </div>
                    </div>

                    {/* Judge Review Details if available */}
                    {task.judge_reasoning && (
                      <div className="bg-[#6D28D9]/5 border border-[#6D28D9]/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[#C4A1FF]" />
                          <span className="text-xs font-bold text-[#C4A1FF] uppercase tracking-wider">Judge AI Verdict & Quality Review</span>
                        </div>
                        <p className="text-sm italic text-gray-300 dark:text-gray-300 pl-4 border-l-2 border-[#6D28D9]/50 font-serif leading-relaxed">
                          "{task.judge_reasoning}"
                        </p>
                      </div>
                    )}

                    {/* Expandable Agent Response Box */}
                    {task.output_data ? (
                      <div>
                        <button 
                          onClick={() => toggleTaskExpand(task.id)}
                          className="flex items-center justify-between w-full text-xs font-bold text-gray-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Code className="w-3.5 h-3.5" /> Agent Output Response
                          </span>
                          <span className="flex items-center gap-1">
                            {isExpanded ? "Hide Details" : "Show Details"} {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </button>

                        {isExpanded ? (
                          <div className="bg-[#12141C] border border-[#262A36] rounded-xl p-4 font-mono text-xs text-[#00FF9D] overflow-x-auto max-h-96 whitespace-pre-wrap relative shadow-inner">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(outputText);
                                alert("Response copied to clipboard!");
                              }}
                              className="absolute top-3 right-3 px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] uppercase font-bold transition-all"
                            >
                              Copy
                            </button>
                            {outputText}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic px-2">
                            Click 'Show Details' to inspect output payload ({outputText.length} characters)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-[#94A3B8] italic bg-[#1A1D24] p-3 rounded-xl border border-[#262A36]">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Agent has not executed or returned output payload yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-brand-text-dim text-center py-8">No AI Agent tasks executed yet.</p>
        )
      )}
    </div>
  );
}
