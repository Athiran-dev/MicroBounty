import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useWallet } from '@txnlab/use-wallet-react';
import { Brain, Star, Activity, DollarSign, Settings, Plus, Play, Square, ExternalLink, X, Save, Image as ImageIcon, Globe, Coins } from 'lucide-react';
import { getSupabase } from '../../utils/supabaseClient';
import { GlassCard } from '../../components/ui/GlassCard';
import { PremiumButton } from '../../components/ui/PremiumButton';
import ImageUpload from '../../components/ImageUpload';

export default function MyAgentsDashboard() {
  const { activeAddress } = useWallet();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleUpdateVisuals = async () => {
    if (!editingAgent) return;
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('ai_agents')
        .update({
          avatar_url: editingAgent.avatar_url,
          preview_images: editingAgent.preview_images,
          endpoint_url: editingAgent.endpoint_url,
          price_per_task_algo: editingAgent.price_per_task_algo
        })
        .eq('agent_id', editingAgent.agent_id);

      if (error) throw error;
      setAgents(agents.map(a => a.agent_id === editingAgent.agent_id ? editingAgent : a));
      setEditingAgent(null);
    } catch (e) {
      console.error(e);
      alert('Failed to update agent visuals.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreviewImage = (index: number, url: string) => {
    if (!editingAgent) return;
    const newPreviews = [...(editingAgent.preview_images || ['', '', ''])];
    newPreviews[index] = url;
    setEditingAgent({ ...editingAgent, preview_images: newPreviews });
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
                          <div className="text-xs text-brand-text-dim flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-2">
                              <span className="uppercase px-1.5 py-0.5 bg-white/5 rounded border border-white/5">{agent.category}</span>
                              <span className="text-green-400 font-bold">{agent.price_per_task_algo} ALGO</span>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-60">
                              <Globe className="w-3 h-3" />
                              <span className="truncate max-w-[150px] font-mono">{agent.endpoint_url || 'No endpoint set'}</span>
                            </div>
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
                        <button 
                          onClick={() => setEditingAgent(agent)}
                          className="p-2 rounded-lg border border-brand-outline-variant/30 text-brand-text-dim hover:bg-brand-surface-high hover:text-gray-900 dark:text-white transition-colors" 
                          title="Edit Visuals"
                        >
                          <ImageIcon className="w-4 h-4" />
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

      {/* Edit Visuals Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingAgent(null)} />
          <GlassCard className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-primary" />
                Edit Visuals: {editingAgent.name}
              </h2>
              <button onClick={() => setEditingAgent(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
              
              {/* Core Config Section */}
              <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary/80 mb-4">Core Configuration</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-gray-300 font-bold text-sm mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-brand-primary" /> Endpoint URL (API)
                    </label>
                    <input 
                      type="text" 
                      value={editingAgent.endpoint_url || ''}
                      onChange={(e) => setEditingAgent({...editingAgent, endpoint_url: e.target.value})}
                      placeholder="https://api.youragent.com/run"
                      className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 font-bold text-sm mb-2 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-brand-primary" /> Pricing (Execution Fee in ALGO)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={editingAgent.price_per_task_algo || 0}
                        onChange={(e) => setEditingAgent({...editingAgent, price_per_task_algo: Number(e.target.value)})}
                        className="w-full bg-brand-bg border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-all pl-12"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary font-bold">Ⱥ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visuals Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Branding & Media</h3>
                
                <ImageUpload 
                  label="Agent Avatar"
                  value={editingAgent.avatar_url}
                  onUpload={(url) => setEditingAgent({...editingAgent, avatar_url: url})}
                />

                <div className="space-y-4">
                  <label className="block text-gray-300 font-bold text-sm">Sample Output Images</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                      <ImageUpload 
                        key={i}
                        value={editingAgent.preview_images?.[i] || ''}
                        onUpload={(url) => updatePreviewImage(i, url)}
                        className="aspect-square"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-white/5">
              <button 
                onClick={() => setEditingAgent(null)}
                className="px-6 py-2 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateVisuals}
                disabled={saving}
                className="px-8 py-2 rounded-xl bg-brand-primary text-gray-900 font-bold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
