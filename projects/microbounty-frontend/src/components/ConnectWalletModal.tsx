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
            className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-md p-6 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Connect Wallet</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-brand-muted" />
                </button>
              </div>

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
                    className="flex items-center justify-between p-4 rounded-xl border border-brand-border bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={wallet.metadata.icon}
                        alt={`${wallet.metadata.name} icon`}
                        className="w-8 h-8 rounded-md"
                      />
                      <span className="font-bold text-lg">{wallet.metadata.name}</span>
                    </div>
                    {wallet.isConnected ? (
                      <span className="text-sm font-mono text-brand-success bg-brand-success/10 px-3 py-1 rounded-full border border-brand-success/20">
                        Connected
                      </span>
                    ) : (
                      <span className="text-sm border border-brand-primary text-brand-primary px-4 py-1.5 rounded-full font-bold">
                        Connect
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
