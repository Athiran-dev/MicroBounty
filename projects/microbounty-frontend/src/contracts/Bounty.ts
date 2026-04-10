// This is a placeholder mock for the AlgoKit generated BountyClient.
// Run 'npm run generate:app-clients' on a machine with AlgoKit installed 
// to generate the actual ABI client.

export class BountyClient {
  public send: any;
  
  constructor(config: any) {
    this.send = {
      createBounty: async () => ({ return: 101 }), // returns a mock bounty_id 101
      applyBounty: async () => ({}),
      submitWork: async () => ({}),
      selectWinnerAndPay: async () => ({})
    };
  }
}
