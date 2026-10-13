import { z } from 'zod';
const label = z.string().trim().min(1).max(160);
export const RequestSchema = z.strictObject({
 id:z.string().regex(/^[a-zA-Z0-9_-]{6,48}$/),kind:z.enum(['procurement','claim']),
 incident:label.nullable(),resources:z.array(z.strictObject({description:z.string().trim().min(1).max(500),quantity:z.number().int().min(1).max(100000).nullable()})).min(1).max(20),
 urgency:z.enum(['unknown','routine','urgent','critical']),amountCents:z.number().int().min(1).max(10000000).nullable(),amountKind:z.enum(['exact','estimate','unknown']),currency:z.literal('USD'),location:label.nullable(),origin:label,revision:z.number().int().min(1).max(1000000),createdAt:z.iso.datetime(),receiptDigest:z.string().regex(/^[a-f0-9]{64}$/).nullable(),transactionReference:z.string().trim().min(1).max(100).nullable(),expenseAt:z.iso.datetime().nullable(),
}).superRefine((r,ctx)=>{if((r.amountCents===null)!==(r.amountKind==='unknown'))ctx.addIssue({code:'custom',message:'Unknown amounts must be explicit; exact/estimate needs cents'});});
export type ResourceRequest = z.infer<typeof RequestSchema>;
export const demoRequest:ResourceRequest = {id:'RL-DEMO01',kind:'procurement',incident:'FLOOD-EMBER-26',resources:[{description:'Bottled drinking water for Ember shelter',quantity:24},{description:'AA batteries for portable radios',quantity:48},{description:'First aid supply kits',quantity:6}],urgency:'urgent',amountCents:12800,amountKind:'exact',currency:'USD',location:'Ember shelter · fictional',origin:'Field team Delta · fictional',revision:1,createdAt:'2026-10-13T08:00:00.000Z',receiptDigest:null,transactionReference:null,expenseAt:null};
export function unknownFields(r:ResourceRequest){return ['incident','amountCents','location',...(r.kind==='claim'?['receiptDigest','expenseAt']:[])].filter(k=>r[k as keyof ResourceRequest]===null).concat(r.resources.flatMap((x,i)=>x.quantity===null?[`quantity ${i+1}`]:[]));}
export function description(r:ResourceRequest){return r.resources.map(x=>x.description).join('; ');}
