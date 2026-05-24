const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL || 'https://sditsitcwpjsxbxnzqtf.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;
const wallet = 'BENJXGI6ONET6EGDKM5XCNWGB4DPN7A6ZEJN4H4PCPT5COK2VWWWMHAMJY';

const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-wallet-address': wallet
    }
  }
});

async function main() {
  console.log("Fetching tasks from Supabase for wallet BENJXG...");
  const { data, error } = await supabase
    .from('ai_tasks')
    .select('*');
  
  if (error) {
    console.error("Error fetching tasks:", error.message);
  } else {
    console.log("Tasks found:", JSON.stringify(data, null, 2));
  }
}

main();
