import { randomUUID } from 'node:crypto';
import { Store, type Payment } from './store';
import type { Order, PayPalProvider } from './paypal';
export class Conflict extends Error{}
export function reconcile(order:Order,p:Payment){
 if(order.id!==p.orderId)throw new Conflict('PayPal order reference mismatch');
 const units=order.purchase_units;if(!units||units.length!==1||units[0].custom_id!==p.reference)throw new Conflict('PayPal procurement reference mismatch');
 const unit=units[0];const expected=(p.amountCents/100).toFixed(2);
 if(unit.amount?.currency_code!=='USD'||unit.amount.value!==expected)throw new Conflict('PayPal amount does not match approved procurement');
 const captures=unit.payments?.captures??[];
 if(order.status==='COMPLETED'){
 if(captures.length!==1||captures[0].status!=='COMPLETED'||captures[0].amount.currency_code!=='USD'||captures[0].amount.value!==expected||captures[0].final_capture!==true)throw new Conflict('Capture is not a single completed payment of the approved amount');
 return captures[0].id;
 }return null;
}
export class Payments{
 private busy=new Set<string>();
 constructor(private store:Store,private paypal:PayPalProvider,private origin:string){}
 private async lock<T>(id:string,fn:()=>Promise<T>){if(this.busy.has(id))throw new Conflict('Operation already in progress; inspect and retry');this.busy.add(id);try{return await fn();}finally{this.busy.delete(id);}}
 private approved(id:string){const row=this.store.record(id);if(!row||row.status!=='approved'||row.record.kind!=='procurement'||row.record.amountKind!=='exact'||row.record.amountCents===null)throw new Conflict('A reviewed, explicitly approved exact procurement is required');return row.record;}
 private save(p:Payment,type:string,data:unknown){p.updatedAt=new Date().toISOString();this.store.atomic(()=>{this.store.putPayment(p);this.store.append(type,p.recordId,data);});}
 async order(id:string){return this.lock(id,async()=>{
 const record=this.approved(id);if(!this.paypal.configured)throw new Conflict('Sandbox credentials missing; no financial action taken');
 let p=this.store.payment(id);if(p?.orderId)return p;if(p?.state==='CREATING')throw new Conflict('Creation is in progress or interrupted; reconcile before retry');
 if(p&&Date.now()-Date.parse(p.startedAt)>5*60*60*1000)throw new Conflict('Uncertain order exceeds conservative idempotency window; manual Sandbox reconciliation required');
 if(!p){const at=new Date().toISOString();p={recordId:id,revision:record.revision,amountCents:record.amountCents!,reference:`${id}:${record.revision}`,state:'CREATING',createKey:randomUUID(),captureKey:randomUUID(),orderId:null,captureId:null,approvalUrl:null,startedAt:at,updatedAt:at,captureStartedAt:null,error:null};this.save(p,'order_attempt_reserved',{revision:p.revision,amountCents:p.amountCents});}
 else{p.state='CREATING';this.save(p,'order_retry_reserved',{requestId:p.createKey});}
 try{
 const order=await this.paypal.createOrder({reference:p.reference,amountCents:p.amountCents,requestId:p.createKey,returnUrl:this.origin+'/?paypal=return&record='+encodeURIComponent(id),cancelUrl:this.origin+'/?paypal=cancel&record='+encodeURIComponent(id)});
 p.orderId=order.id;reconcile(order,p);const href=order.links?.find(x=>x.rel==='payer-action'||x.rel==='approve')?.href;if(!href)throw new Conflict('PayPal did not return a buyer approval link');const url=new URL(href);if(url.protocol!=='https:'||url.hostname!=='www.sandbox.paypal.com')throw new Conflict('Non-Sandbox approval URL rejected');
 p.approvalUrl=href;p.state='ORDER_CREATED';p.error=null;this.save(p,'paypal_order_created',{orderId:p.orderId,revision:p.revision,amountCents:p.amountCents,environment:'sandbox'});return p;
 }catch(e){p.state='CREATE_UNCERTAIN';p.error='Order creation interrupted or rejected; inspect before retry';this.save(p,'order_creation_uncertain',{code:'PROVIDER_OR_RECONCILIATION_ERROR'});throw e;}
 });}
 async capture(id:string){return this.lock(id,async()=>{
 this.approved(id);const p=this.store.payment(id);if(!p?.orderId)throw new Conflict('No PayPal order exists');if(p.state==='PAID')return p;
 const authoritative=await this.paypal.getOrder(p.orderId);const captureId=reconcile(authoritative,p);
 if(captureId){p.state='PAID';p.captureId=captureId;p.error=null;this.save(p,'capture_completed',{orderId:p.orderId,captureId,amountCents:p.amountCents,environment:'sandbox',source:'order_inspection'});return p;}
 if(authoritative.status!=='APPROVED')throw new Conflict('Buyer approval is not confirmed by PayPal');
 if(p.state==='CAPTURING')throw new Conflict('Capture in progress; reconcile after interruption');
 if((p.state==='CAPTURE_UNCERTAIN')&&Date.now()-Date.parse(p.captureStartedAt??p.startedAt)>5*60*60*1000)throw new Conflict('Capture retry window expired; inspect Sandbox dashboard');
 p.captureStartedAt??=new Date().toISOString();p.state='CAPTURING';this.save(p,'buyer_approval_observed',{orderId:p.orderId,source:'authoritative_order_inspection'});
 try{await this.paypal.captureOrder(p.orderId,p.captureKey);const inspected=await this.paypal.getOrder(p.orderId);const confirmed=reconcile(inspected,p);if(!confirmed)throw new Conflict('Capture completion is not yet authoritative');p.captureId=confirmed;p.state='PAID';p.error=null;this.save(p,'capture_completed',{orderId:p.orderId,captureId:confirmed,amountCents:p.amountCents,environment:'sandbox',source:'order_inspection'});return p;
 }catch(e){p.state='CAPTURE_UNCERTAIN';p.error='Capture completion unknown; reconcile before retry';this.save(p,'capture_uncertain',{orderId:p.orderId});throw e;}
 });}
 async inspect(id:string){return this.lock(id,async()=>{const p=this.store.payment(id);if(!p?.orderId)throw new Conflict('No known order to inspect');const order=await this.paypal.getOrder(p.orderId);const captureId=reconcile(order,p);if(captureId&&p.state!=='PAID'){p.captureId=captureId;p.state='PAID';p.error=null;this.save(p,'capture_completed',{orderId:p.orderId,captureId,amountCents:p.amountCents,environment:'sandbox',source:'order_inspection'});}return {payment:p,paypalStatus:order.status};});}
 recoverInterrupted(){for(const p of this.store.payments()){if(p.state==='CREATING'){p.state='CREATE_UNCERTAIN';this.save(p,'order_interruption_recovered',{requestId:p.createKey});}else if(p.state==='CAPTURING'){p.state='CAPTURE_UNCERTAIN';this.save(p,'capture_interruption_recovered',{orderId:p.orderId});}}}
}
