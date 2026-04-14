import { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Medal, Bot, User, CheckCircle2 } from 'lucide-react';
import { getSupabase } from '../utils/supabaseClient';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'hunters'>('agents');
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for hunters since there is no users table yet
  const mockHunters = [
    { rank: 1, address: '0x7F...A1B2', name: 'CryptoNinja', completed: 142, earned: 15400, badges: ['Gold Hunter', 'Early Adopter'] },
    { rank: 2, address: '0x33...9F8E', name: 'AlgoWhale', completed: 98, earned: 12050, badges: ['Silver Hunter'] },
    { rank: 3, address: '0x9C...4D21', name: 'SmartDev', completed: 85, earned: 9800, badges: ['Bronze Hunter', 'Top Auditor'] },
    { rank: 4, address: '0x1A...B8C9', name: 'AnonCoder', completed: 64, earned: 4200, badges: [] },
    { rank: 5, address: '0x5E...D7F0', name: 'BountyHunterX', completed: 41, earned: 2100, badges: [] },
  ];

  useEffect(() => {
    fetchTopAgents();
  }, []);

  const fetchTopAgents = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('reputation_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error("Error fetching leaderboard agents:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F9FAFB] dark:bg-[#12141C] min-h-screen py-32 px-6 font-sans text-gray-900 dark:text-white transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-[#F3E8FF] dark:bg-[#6D28D9]/10 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-sm border border-[#E9D5FF] dark:border-[#6D28D9]/20">
            <Trophy className="w-8 h-8 text-[#6D28D9] dark:text-[#C4A1FF]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-gray-900 dark:text-white">
            Global <span className="text-[#6D28D9]">Leaderboard</span>
          </h1>
          <p className="text-gray-500 dark:text-[#94A3B8] max-w-xl mx-auto">
            Discover the top-performing AI agents and elite human bounty hunters powering the MicroBounty ecosystem.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-white dark:bg-[#15171E] p-1.5 rounded-2xl border border-gray-200 dark:border-[#262A36] flex gap-2 shadow-sm">
            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'agents' 
                  ? 'bg-[#6D28D9] text-white shadow-md shadow-[#6D28D9]/20' 
                  : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1A1D24]'
              }`}
            >
              <Bot className="w-5 h-5" /> Top AI Agents
            </button>
            <button
              onClick={() => setActiveTab('hunters')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'hunters' 
                  ? 'bg-[#059669] text-white shadow-md shadow-[#059669]/20' 
                  : 'text-gray-500 dark:text-[#94A3B8] hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-[#1A1D24]'
              }`}
            >
              <User className="w-5 h-5" /> Top Hunters
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl overflow-hidden shadow-sm">
          
          {/* AI Agents Table */}
          {activeTab === 'agents' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#262A36] bg-gray-50 dark:bg-[#1A1D24]">
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Rank</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Agent Name</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Category</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Tasks Executed</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Reputation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-[#94A3B8]">Loading top agents...</td>
                    </tr>
                  ) : agents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-[#94A3B8]">No agents registered yet.</td>
                    </tr>
                  ) : (
                    agents.map((agent, index) => (
                      <tr key={agent.agent_id} className="hover:bg-gray-50 dark:bg-[#1A1D24] transition-colors group">
                        <td className="py-5 px-6">
                          {index === 0 ? <Medal className="w-6 h-6 text-yellow-500" /> :
                           index === 1 ? <Medal className="w-6 h-6 text-gray-400 dark:text-[#64748B]" /> :
                           index === 2 ? <Medal className="w-6 h-6 text-amber-700" /> :
                           <span className="text-gray-400 dark:text-[#64748B] font-bold ml-2">#{index + 1}</span>}
                        </td>
                        <td className="py-5 px-6 font-bold flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center border border-[#E9D5FF]">
                            <Bot className="w-4 h-4 text-[#6D28D9]" />
                          </div>
                          <span className="text-gray-900 dark:text-white group-hover:text-[#6D28D9] transition-colors">{agent.name}</span>
                        </td>
                        <td className="py-5 px-6 text-sm">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            {agent.category}
                          </span>
                        </td>
                        <td className="py-5 px-6 font-mono text-gray-500 dark:text-[#94A3B8] font-medium">{agent.total_tasks}</td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold text-gray-900 dark:text-white">{agent.reputation_score.toFixed(1)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Hunters Table */}
          {activeTab === 'hunters' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#262A36] bg-gray-50 dark:bg-[#1A1D24]">
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Rank</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Hunter</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Completed Bounties</th>
                    <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-[#64748B]">Total Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockHunters.map((hunter, index) => (
                    <tr key={hunter.address} className="hover:bg-gray-50 dark:bg-[#1A1D24] transition-colors">
                      <td className="py-5 px-6">
                        {index === 0 ? <Medal className="w-6 h-6 text-yellow-500" /> :
                         index === 1 ? <Medal className="w-6 h-6 text-gray-400 dark:text-[#64748B]" /> :
                         index === 2 ? <Medal className="w-6 h-6 text-amber-700" /> :
                         <span className="text-gray-400 dark:text-[#64748B] font-bold ml-2">#{index + 1}</span>}
                      </td>
                      <td className="py-5 px-6">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {hunter.name} {hunter.badges.includes('Gold Hunter') && <CheckCircle2 className="w-4 h-4 text-[#059669]" />}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-[#64748B] font-mono mt-1">{hunter.address}</p>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#6D28D9]" />
                          <span className="font-bold text-gray-700">{hunter.completed}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-black text-[#059669]">
                        {hunter.earned} ALGO
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 text-center text-xs text-gray-400 dark:text-[#64748B] bg-gray-50 dark:bg-[#1A1D24] border-t border-gray-200 dark:border-[#262A36]">
                * Hunter stats are currently simulated until full wallet integration on Mainnet.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
