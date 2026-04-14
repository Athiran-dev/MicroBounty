import { useWallet } from '@txnlab/use-wallet-react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { wallets } = useWallet();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#262A36] rounded-[32px] w-full max-w-md p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden"
            >
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#6D28D9]/10 dark:bg-[#C4A1FF]/10 blur-[60px] -mr-16 -mt-16" />
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Connect_Wallet</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#262A36] rounded-full transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[10px] text-gray-400 dark:text-[#64748B] font-black uppercase tracking-[0.3em]">Select_Network_Provider</p>

              <div className="flex flex-col gap-3">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      if (wallet.isConnected) {
                        wallet.disconnect();
                      } else {
                        wallet.connect();
                        onClose();
                      }
                    }}
                    className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 dark:border-[#262A36] bg-gray-50/50 dark:bg-[#1A1D24]/50 hover:border-[#6D28D9] dark:hover:border-[#C4A1FF] hover:bg-white dark:hover:bg-[#1D212B] transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <img
                        src={wallet.metadata.icon}
                        alt={`${wallet.metadata.name} icon`}
                        className="w-10 h-10 rounded-xl"
                      />
                      <span className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#6D28D9] dark:group-hover:text-[#C4A1FF] transition-colors">{wallet.metadata.name}</span>
                    </div>
                    {wallet.isConnected ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#059669] bg-[#059669]/10 px-3 py-1.5 rounded-lg border border-[#059669]/20 relative z-10">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] border border-gray-200 dark:border-[#334155] text-gray-500 dark:text-[#94A3B8] px-4 py-1.5 rounded-lg font-black uppercase tracking-widest group-hover:border-[#6D28D9] dark:group-hover:border-[#C4A1FF] group-hover:text-[#6D28D9] dark:group-hover:text-[#C4A1FF] group-hover:bg-[#F3E8FF] dark:group-hover:bg-[#6D28D9]/10 transition-all relative z-10">
                        LINK
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
