import { x402Client } from '@x402-avm/core/client';
import { registerExactAvmScheme } from '@x402-avm/avm/exact/client';
import algosdk from 'algosdk';

async function test() {
  const client = new x402Client();
  registerExactAvmScheme(client, {
    signer: {
      address: 'ISOM7J3NG65QEK4ZMH3ZREXDQBH4NMALY6M22HL7BXDMDSEBJNWO7DAHWY',
      signTransactions: async (txns) => txns, // Mock sign
    }
  });

  const req = {
    x402Version: 2,
    resource: 'abc',
    description: 'def',
    accepts: [{
      scheme: 'exact',
      network: 'algorand:testnet',
      amount: '1000',
      payTo: 'ISOM7J3NG65QEK4ZMH3ZREXDQBH4NMALY6M22HL7BXDMDSEBJNWO7DAHWY',
      asset: '0'
    }]
  };

  const payload = await client.createPaymentPayload(req as any);
  console.log(JSON.stringify(payload, null, 2));
}
test().catch(console.error);
