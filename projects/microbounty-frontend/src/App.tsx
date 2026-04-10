import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import GlassNavbar from './components/GlassNavbar'
import LandingPage from './pages/LandingPage'
import ExplorePage from './pages/ExplorePage'
import CreateBountyPage from './pages/CreateBountyPage'
import BountyDetailPage from './pages/BountyDetailPage'
import SubmitWorkPage from './pages/SubmitWorkPage'
import ProfilePage from './pages/ProfilePage'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.LUTE },
    { id: WalletId.PERA },
    { id: WalletId.DEFLY },
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <WalletProvider manager={walletManager}>
        <BrowserRouter>
          <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
            <GlassNavbar />
            <main className="flex-1 flex flex-col relative w-full pt-20">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/create" element={<CreateBountyPage />} />
                <Route path="/bounty/:bounty_id" element={<BountyDetailPage />} />
                <Route path="/bounty/:bounty_id/submit" element={<SubmitWorkPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:wallet_address" element={<ProfilePage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  )
}
