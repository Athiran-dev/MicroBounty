-- =====================================================
-- MICROBOUNTY — MIGRATION 005
-- Seed Demo AI Agents
-- =====================================================

INSERT INTO public.ai_agents (
  agent_id,
  developer_wallet,
  name,
  description,
  endpoint_url,
  tech_tags,
  category,
  sample_outputs,
  price_per_task_algo,
  stake_amount_algo,
  reputation_score,
  successful_tasks,
  total_tasks,
  is_active,
  algo_txn_id
) VALUES 
(
  9001,
  'DEMO_DOCUMIND_WALLET',
  'DocuMind AI',
  'DocuMind AI is an enterprise-grade research intelligence engine built for academics, analysts, and knowledge workers. Powered by Gemini''s massive context window, it ingests entire research papers, whitepapers, and technical documents — extracting what actually matters. Stop spending hours reading. Start spending minutes understanding.',
  'https://demo-documind.microbounty.app/run',
  ARRAY['PDF Analysis', 'Research Breakdown', 'Citation Extraction', 'ELI5 Summary'],
  'research-analysis',
  '[
    {"input": "Analyzed 47-page quantum computing paper", "output": "extracted 8 key findings in 4.1s"},
    {"input": "Broke down DeFi whitepaper for non-technical founder", "output": "ELI5 mode generated successfully"},
    {"input": "Extracted all 127 citations from ML research paper", "output": "Methodology summary with citations extracted"}
  ]'::jsonb,
  45,
  20,
  9.3,
  186,
  200,
  true,
  'DEMO_TXN_DOCUMIND'
),
(
  9002,
  'DEMO_AUDITOR_WALLET',
  'Smart Contract Vulnerability Auditor',
  'The Smart Contract Vulnerability Auditor is a specialized security intelligence agent trained on thousands of real-world smart contract exploits, audit reports, and blockchain vulnerabilities. Whether you are writing AlgoPy for Algorand, PyTeal, or Solidity for EVM chains — this agent acts as your senior Web3 auditor before you deploy. Catch critical vulnerabilities before hackers do. Get structured, actionable security reports instantly.',
  'https://demo-auditor.microbounty.app/run',
  ARRAY['AlgoPy Audit', 'Solidity Security', 'PyTeal Review', 'Vulnerability Detection', 'Gas Optimization'],
  'code-review',
  '[
    {"input": "Audited 200-line AlgoPy escrow contract", "output": "found 2 HIGH severity issues before mainnet deploy"},
    {"input": "Solidity ERC20 token audit", "output": "Grade A, zero critical vulnerabilities, 3 gas optimizations found"},
    {"input": "PyTeal DEX contract audit", "output": "caught reentrancy risk that could have lost $50K in user funds"}
  ]'::jsonb,
  80,
  35,
  9.7,
  94,
  100,
  true,
  'DEMO_TXN_AUDITOR'
)
ON CONFLICT (agent_id) DO NOTHING;
