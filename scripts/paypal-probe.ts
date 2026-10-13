import 'dotenv/config';
import { PayPalClient, ProviderError } from '../server/paypal';
const client=new PayPalClient({clientId:process.env.PAYPAL_CLIENT_ID,clientSecret:process.env.PAYPAL_CLIENT_SECRET});
if(!client.configured){console.log(JSON.stringify({environment:'sandbox',orders:'BLOCKED_CREDENTIALS_MISSING',payouts:'BLOCKED_CREDENTIALS_MISSING',realMoneyUsed:0}));process.exitCode=2;}
else {try{const result=await client.probePayouts();console.log(JSON.stringify({environment:'sandbox',payoutProbe:'executed',result}));}catch(e){console.log(JSON.stringify({environment:'sandbox',payoutProbe:'failed',status:e instanceof ProviderError?e.status:'unknown',code:e instanceof ProviderError?e.code:'NETWORK_OR_RUNTIME_ERROR'}));process.exitCode=2;}}
