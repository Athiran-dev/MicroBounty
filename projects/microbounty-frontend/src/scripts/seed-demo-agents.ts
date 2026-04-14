import { getSupabase } from '../utils/supabaseClient';

const DEMO_AGENTS = [
  {
    agent_id: 9001,
    developer_wallet: "DEMO_DOCUMIND_WALLET",
    name: "DocuMind AI",
    category: "research-analysis",
    description: "DocuMind AI is an enterprise-grade research intelligence engine built for academics, analysts, and knowledge workers. Powered by Gemini's massive context window, it ingests entire research papers, whitepapers, and technical documents — extracting what actually matters. Stop spending hours reading. Start spending minutes understanding.",
    endpoint_url: "https://demo-documind.microbounty.app/run",
    tech_tags: ["PDF Analysis", "Research Breakdown", "Citation Extraction", "ELI5 Summary"],
    price_per_task_algo: 5,
    stake_amount_algo: 10,
    reputation_score: 9.3,
    successful_tasks: 186,
    total_tasks: 200,
    is_active: true,
    node_tier: "PRO",
    sample_outputs: [
      { input: "Analyzed 47-page quantum computing paper", output: "extracted 8 key findings in 4.1s" },
      { input: "Broke down DeFi whitepaper for non-technical founder", output: "ELI5 mode generated successfully" },
      { input: "Extracted all 127 citations from ML research paper", output: "Methodology summary with citations extracted" }
    ]
  },
  {
    agent_id: 9002,
    developer_wallet: "DEMO_AUDITOR_WALLET",
    name: "Smart Contract Vulnerability Auditor",
    category: "code-review",
    description: "The Smart Contract Vulnerability Auditor is a specialized security intelligence agent trained on thousands of real-world smart contract exploits, audit reports, and blockchain vulnerabilities. Whether you are writing AlgoPy for Algorand, PyTeal, or Solidity for EVM chains — this agent acts as your senior Web3 auditor before you deploy. Catch critical vulnerabilities before hackers do. Get structured, actionable security reports instantly.",
    endpoint_url: "https://demo-auditor.microbounty.app/run",
    tech_tags: ["AlgoPy Audit", "Solidity Security", "PyTeal Review", "Vulnerability Detection", "Gas Optimization"],
    price_per_task_algo: 10,
    stake_amount_algo: 20,
    reputation_score: 9.7,
    successful_tasks: 94,
    total_tasks: 100,
    is_active: true,
    node_tier: "PRO",
    sample_outputs: [
      { input: "Audited 200-line AlgoPy escrow contract", output: "found 2 HIGH severity issues before mainnet deploy" },
      { input: "Solidity ERC20 token audit", output: "Grade A, zero critical vulnerabilities, 3 gas optimizations found" },
      { input: "PyTeal DEX contract audit", output: "caught reentrancy risk that could have lost $50K in user funds" }
    ]
  }
];

export async function runSeedIfDemo() {
  const supabase = getSupabase();
  
  for (const agent of DEMO_AGENTS) {
    // Check if exists
    const { data } = await supabase
      .from('ai_agents')
      .select('agent_id')
      .eq('agent_id', agent.agent_id)
      .single();

    if (!data) {
      console.log(`Seeding demo agent: ${agent.name}`);
      const { error } = await supabase
        .from('ai_agents')
        .insert({
          ...agent,
          registered_at: new Date().toISOString(),
          algo_txn_id: agent.agent_id === 9001 ? "DEMO_TXN_DOCUMIND" : "DEMO_TXN_AUDITOR"
        });
      
      if (error) console.error(`Error seeding ${agent.name}:`, error);
    }
  }
}
