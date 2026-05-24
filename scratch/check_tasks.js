const algosdk = require('algosdk');
const client = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);
const appId = 762671388;

async function checkTask(id) {
  try {
    const boxName = new Uint8Array([116, 95, ...algosdk.encodeUint64(id)]);
    const res = await client.getApplicationBoxByName(appId, boxName).do();
    const val = res.value;
    const clientAddress = algosdk.encodeAddress(val.slice(0, 32));
    const agentId = Number(algosdk.decodeUint64(val.slice(32, 40)));
    const payment = Number(algosdk.decodeUint64(val.slice(40, 48)));
    const net = Number(algosdk.decodeUint64(val.slice(48, 56)));
    const status = val[56];
    console.log(`Task ${id}: client=${clientAddress}, agentId=${agentId}, payment=${payment/1e6} ALGO, net=${net/1e6} ALGO, status=${status}`);
  } catch (e) {
    console.log(`Task ${id}: not found or error`, e.message);
  }
}

async function main() {
  await checkTask(1);
  await checkTask(2);
  await checkTask(3);
  await checkTask(4);
}
main();
