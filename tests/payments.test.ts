import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { createApp } from '../server/app';
import { demoRequest } from '../src/requests/schema';
import { validateChain } from '../src/audit/chain';
import { PayPalClient, type PayPalProvider } from '../server/paypal';
const roots:string[]=[];
afterEach(()=>{for(const r of roots.splice(0))rmSync(r,{recursive:true,force:true});});
function provider(){let creates=0,captures=0,approved=false; let captured=false;let body:any;
 const get = ()=>({id:'ORDER123',status:captured?'COMPLETED':approved?'APPROVED':'CREATED',purchase_units:[{custom_id:body.reference,amount:{currency_code:'USD',value:(body.amountCents/100).toFixed(2)},payments:captured?{captures:[{id:'CAPTURE123',status:'COMPLETED',final_capture:true,amount:{currency_code:'USD',value:(body.amountCents/100).toFixed(2)}}]}:undefined}],links:[{rel:'approve',href:'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123'}]});
 const api:PayPalProvider={configured:true,createOrder:async x=>{creates++;body=x;return get();},getOrder:async()=>get(),captureOrder:async()=>{captures++;captured=true;return get();},verifyWebhook:async()=>false};
 return {api,approve:()=>approved=true,counts:()=>({creates,captures}),tamper:()=>body.amountCents=1};
}
function setup(){const dir=mkdtempSync(join(tmpdir(),'rl-'));roots.push(dir);const store=new Store(join(dir,'db.sqlite')); const p=provider();const app=createApp({store,paypal:p.api,password:'long-test-passphrase',origin:'http://127.0.0.1:4173'});return {store,p,app};}
async function login(app:any){const agent=request.agent(app);await agent.post('/api/session').send({password:'long-test-passphrase'}).expect(200);return agent;}
async function approved(agent:any){await agent.post('/api/requests').send({record:demoRequest,provenance:'local'}).expect(201);await agent.post(`/api/requests/${demoRequest.id}/review`).send({revision:1,disposition:'clear',note:'Verified synthetic supplies'}).expect(200);await agent.post(`/api/requests/${demoRequest.id}/approve`).send({revision:1,amountCents:demoRequest.amountCents,confirm:true}).expect(200);}
describe('financial boundary: local provider double, not real PayPal',()=>{
 it('rejects unauthorized capture and unreviewed authorization',async()=>{const {app,store}=setup();await request(app).post('/api/payments/RL-DEMO01/capture').send({confirm:true}).expect(401);const a=await login(app);await a.post('/api/requests').send({record:demoRequest,provenance:'qr'}).expect(201);await a.post('/api/requests/RL-DEMO01/approve').send({revision:1,amountCents:12800,confirm:true}).expect(409);store.close();});
 it('rejects browser amount tampering and mutation through foreign origins',async()=>{const {app,store}=setup();const a=await login(app);await approved(a);await a.post('/api/payments/RL-DEMO01/order').send({amountCents:1}).expect(400);await a.post('/api/payments/RL-DEMO01/order').set('Origin','https://evil.example').send({confirm:true}).expect(403);store.close();});
 it('guards concurrent retries and only marks authoritative capture paid',async()=>{const {app,store,p}=setup();const a=await login(app);await approved(a);const responses=await Promise.all([a.post('/api/payments/RL-DEMO01/order').send({confirm:true}),a.post('/api/payments/RL-DEMO01/order').send({confirm:true})]);expect(responses.every(r=>r.status===200||r.status===409)).toBe(true);expect(p.counts().creates).toBe(1);expect(store.payment('RL-DEMO01')?.state).toBe('ORDER_CREATED');await a.post('/api/payments/RL-DEMO01/capture').send({confirm:true}).expect(409);p.approve();await a.post('/api/payments/RL-DEMO01/capture').send({confirm:true}).expect(200);await a.post('/api/payments/RL-DEMO01/capture').send({confirm:true}).expect(200);expect(p.counts().captures).toBe(1);expect(store.payment('RL-DEMO01')?.state).toBe('PAID');expect(validateChain(store.events()).valid).toBe(true);store.close();});
 it('rejects authoritative amount mismatch',async()=>{const {app,store,p}=setup();const a=await login(app);await approved(a);await a.post('/api/payments/RL-DEMO01/order').send({confirm:true}).expect(200);p.approve();p.tamper();await a.post('/api/payments/RL-DEMO01/capture').send({confirm:true}).expect(409);expect(p.counts().captures).toBe(0);store.close();});
 it('rejects invalid webhooks without changing state',async()=>{const {app,store}=setup();await request(app).post('/api/webhooks/paypal').send({id:'EVENT123',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{id:'CAPTURE123'}}).expect(400);expect(store.events()).toHaveLength(0);store.close();});
 it('persists financial approvals and detects audit tampering across restart',async()=>{const {app,store}=setup();const a=await login(app);await approved(a);const path=store.path; const original=store.events();store.close();const restored=new Store(path);expect(restored.record('RL-DEMO01')?.status).toBe('approved');expect(validateChain(original).valid).toBe(true);const bad=structuredClone(original);bad[0].type='capture_completed';expect(validateChain(bad).valid).toBe(false);restored.close();});
});
describe('PayPal REST contract double',()=>{
 it('uses fixed Sandbox endpoint, OAuth and stable request IDs',async()=>{const seen:any[]=[];const client=new PayPalClient({clientId:'fake-id',clientSecret:'fake-secret'},async(url,options)=>{seen.push({url,options});return new Response(JSON.stringify(String(url).endsWith('/token')?{access_token:'test-access-token',expires_in:300}:{id:'ORDER123',status:'CREATED',purchase_units:[],links:[]}));});await client.createOrder({reference:'RL-DEMO01:1',amountCents:12800,requestId:'stable-create-id',returnUrl:'http://127.0.0.1:4173/?paypal=return',cancelUrl:'http://127.0.0.1:4173/?paypal=cancel'});expect(seen.every(x=>String(x.url).startsWith('https://api-m.sandbox.paypal.com/'))).toBe(true);expect(seen[1].options.headers['PayPal-Request-Id']).toBe('stable-create-id');expect(JSON.parse(seen[1].options.body).purchase_units[0].amount.value).toBe('128.00');});
});
