import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { Message, BountyRoom } from '../utils/supabase-types';
import { subscribeToRoom, unsubscribeFromRoom, getMessages, sendMessage, getRoomByBountyId } from '../utils/supabase-helpers';
import { shortenAddress } from '../lib/utils';
import { Send, MessageSquare } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatRoomProps {
  bountyId: number;
}

export default function ChatRoom({ bountyId }: ChatRoomProps) {
  const { activeAddress } = useWallet();
  const [room, setRoom] = useState<BountyRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputData, setInputData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let mounted = true;

    const setupChat = async () => {
      if (!activeAddress) return;
      
      try {
        setIsLoading(true);
        // 1. Check if user is in room
        const roomData = await getRoomByBountyId(bountyId, activeAddress);
        if (!roomData) {
          if (mounted) setIsLoading(false);
          return;
        }
        
        if (mounted) setRoom(roomData);

        // 2. Fetch history
        const history = await getMessages(roomData.id, activeAddress);
        if (mounted) {
          setMessages(history);
          setTimeout(scrollToBottom, 100);
        }

        // 3. Subscribe to realtime inserted messages
        channelRef.current = subscribeToRoom(
          roomData.id,
          (newMsg) => {
            if (mounted) {
              setMessages((prev) => [...prev, newMsg]);
              setTimeout(scrollToBottom, 100);
            }
          },
          activeAddress
        );

      } catch (err) {
        console.error("Chat setup error", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    setupChat();

    return () => {
      mounted = false;
      if (channelRef.current) {
        unsubscribeFromRoom(channelRef.current);
      }
    };
  }, [bountyId, activeAddress]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputData.trim() || !activeAddress || !room) return;

    const content = inputData;
    setInputData('');
    
    try {
      await sendMessage(room.id, activeAddress, content);
      // realtime subscription handles appending
    } catch (err) {
      console.error("Fail to send", err);
      // rollback input visually
      setInputData(content);
    }
  };

  if (!activeAddress) return null;
  if (isLoading) return <div className="glass-panel p-6 animate-pulse h-64"></div>;
  if (!room) return null; // Not a member of the room

  return (
    <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-3xl flex flex-col h-[600px] overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-100 dark:border-[#262A36] bg-gray-50/50 dark:bg-[#1A1D24]/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] dark:bg-[#6D28D9]/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#6D28D9] dark:text-[#C4A1FF]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Bounty Hunters Chat</h3>
            <p className="text-[10px] text-gray-400 dark:text-[#64748B] font-bold uppercase tracking-widest">Real-time Node Activity</p>
          </div>
        </div>
        <span className="text-[10px] bg-gray-100 dark:bg-[#262A36] px-3 py-1.5 rounded-lg font-black text-gray-500 dark:text-[#94A3B8] border border-gray-200 dark:border-[#334155] tracking-widest">
          NODE: {shortenAddress(room.id)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-[#64748B] italic text-sm gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 dark:border-[#262A36] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 opacity-20" />
            </div>
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_wallet === activeAddress;
            return (
              <div key={msg.id || i} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <span className="text-[10px] text-gray-400 dark:text-[#64748B] font-black uppercase tracking-widest mb-1.5 px-1">
                  {isMe ? 'Local Node (You)' : `Peer: ${shortenAddress(msg.sender_wallet)}`}
                </span>
                <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                  isMe 
                    ? 'bg-[#6D28D9] text-white rounded-tr-none' 
                    : 'glass dark:bg-[#1A1D24]/80 text-gray-900 dark:text-white rounded-tl-none border border-gray-200 dark:border-[#262A36]'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-[#262A36] bg-gray-50 dark:bg-[#1A1D24] flex gap-3">
        <input 
          type="text" 
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] text-gray-900 dark:text-white text-sm transition-all"
        />
        <button 
          type="submit" 
          disabled={!inputData.trim()}
          className="bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-md shadow-[#6D28D9]/20"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
