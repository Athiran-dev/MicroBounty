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
    <div className="glass-panel border-white/5 flex flex-col h-[500px] overflow-hidden">
      <div className="p-4 border-b border-brand-border bg-black/20 flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-brand-primary" />
        <h3 className="font-bold">Bounty Hunters Chat</h3>
        <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded font-mono text-brand-muted">
          ID: {shortenAddress(room.id)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-brand-muted italic text-sm">
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_wallet === activeAddress;
            return (
              <div key={msg.id || i} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <span className="text-[10px] text-brand-muted font-mono mb-1 px-1">
                  {isMe ? 'You' : shortenAddress(msg.sender_wallet)}
                </span>
                <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-brand-primary text-white rounded-tr-sm' : 'glass bg-white/5 text-brand-text border-white/5 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-brand-border bg-black/20 flex gap-2">
        <input 
          type="text" 
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-brand-primary text-sm"
        />
        <button 
          type="submit" 
          disabled={!inputData.trim()}
          className="bg-brand-primary hover:bg-blue-600 disabled:bg-brand-surface disabled:text-brand-muted p-2 rounded-xl transition-colors shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
