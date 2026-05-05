import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useWallet } from '@txnlab/use-wallet-react';
import { Brain, Star, Activity, DollarSign, Settings, Plus, Play, Square, ExternalLink } from 'lucide-react';
import { getSupabase } from '../../utils/supabaseClient';
import { GlassCard } from '../../components/ui/GlassCard';
import { PremiumButton } from '../../components/ui/PremiumButton';

export default function MyAgentsDashboard() {
  const { activeAddress } = useWallet();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeAddress) fetchAgents();
    else setLoading(false);
  }, [activeAddress]);

  const fetchAgents = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('developer_wallet', activeAddress);

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ai_agents')
        .update({ is_active: !currentStatus })
        .eq('agent_id', agentId);

      if (error) throw error;
      setAgents(agents.map(a => a.agent_id === agentId ? { ...a, is_active: !currentStatus } : a));
    } catch (e) {
      console.error(e);
    }
  };

  if (!activeAddress) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <Brain className="w-16 h-16 text-brand-text-dim mx-auto mb-6 opacity-20" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Connect Wallet to Manage Agents</h2>
        <p className="text-brand-text-dim">You need to connect your Pera Wallet to view your registered AI agents.</p>
      </div>
    );
  }

  return (
    <DashboardLayout showSidebar={false}>
      <div className="max-w-[1200px] mx-auto px-6 py-12 w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-2 text-gray-900 dark:text-white">
            My <span className="text-brand-primary">Agents</span>
          </h1>
          <p className="text-brand-text-dim text-sm">Manage your deployed AI agents and track their performance.</p>
        </div>
        <Link to="/ai-tasks/register">
          <PremiumButton>
            <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Deploy New Agent</span>
          </PremiumButton>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-xs text-brand-text-dim uppercase">Total Agents</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{agents.length}</h3>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-brand-text-dim uppercase">Total Earnings</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {agents.reduce((acc, curr) => acc + (curr.successful_tasks * curr.price_per_task_algo * 0.9), 0).toFixed(0)} <span className="text-sm">ALGO</span>
              </h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-brand-text-dim uppercase">Tasks Executed</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {agents.reduce((acc, curr) => acc + curr.total_tasks, 0)}
              </h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-brand-text-dim uppercase">Avg Reputation</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {agents.length > 0 ? (agents.reduce((acc, curr) => acc + curr.reputation_score, 0) / agents.length).toFixed(1) : '0.0'}
              </h3>
            </div>
          </div>
        </GlassCard>
      </div>

      {loading ? (
        <div className="text-center py-20 text-brand-text-dim">Loading your agents...</div>
      ) : agents.length === 0 ? (
        <GlassCard className="p-12 text-center border-brand-outline-variant/20 border-dashed">
          <div className="w-16 h-16 bg-brand-surface-high/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-brand-text-dim" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Agents Deployed</h3>
          <p className="text-brand-text-dim mb-6 max-w-md mx-auto">
            You haven't deployed any AI agents yet. Register your first agent to start earning ALGO.
          </p>
          <Link to="/ai-tasks/register">
            <PremiumButton>
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Deploy Agent</span>
            </PremiumButton>
          </Link>
        </GlassCard>
      ) : (
        <div className="bg-brand-bg border border-brand-outline-variant/30 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-brand-surface-high/30 border-b border-brand-outline-variant/30 text-xs uppercase font-bold text-brand-text-dim tracking-wider">
                <tr>
                  <th className="px-6 py-4">Agent Details</th>
                  <th className="px-6 py-4">Performance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-outline-variant/10">
                {agents.map(agent => (
                  <tr key={agent.agent_id} className="hover:bg-brand-surface-high/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center shrink-0">
                          <Brain className="w-5 h-5 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {agent.name}
                            <Link to={`/ai-tasks/${agent.agent_id}`} className="text-brand-text-dim hover:text-brand-primary">
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="text-xs text-brand-text-dim flex items-center gap-2 mt-1">
                            <span className="uppercase">{agent.category}</span>
                            <span>•</span>
                            <span className="text-green-400 font-bold">{agent.price_per_task_algo} ALGO</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-900 dark:text-white mb-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" /> {agent.reputation_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-brand-text-dim">
                          {agent.successful_tasks} / {agent.total_tasks} Executions
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        agent.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleAgentStatus(agent.agent_id, agent.is_active)}
                          className={`p-2 rounded-lg border transition-colors ${
                            agent.is_active 
                              ? 'border-brand-outline-variant/30 text-brand-text-dim hover:bg-brand-surface-high hover:text-gray-900 dark:text-white' 
                              : 'border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10'
                          }`}
                          title={agent.is_active ? "Pause Agent" : "Activate Agent"}
                        >
                          {agent.is_active ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button className="p-2 rounded-lg border border-brand-outline-variant/30 text-brand-text-dim hover:bg-brand-surface-high hover:text-gray-900 dark:text-white transition-colors" title="Settings">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
