import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { eventHash, type AuditEvent } from '../src/audit/chain';
import type { ResourceRequest } from '../src/requests/schema';
export type StoredRecord={record:ResourceRequest;provenance:'local'|'qr';status:'pending'|'reviewed'|'approved'|'held'|'reimbursement-approved';reviewNote:string|null};
export type Payment={recordId:string;revision:number;amountCents:number;reference:string;state:'CREATING'|'CREATE_UNCERTAIN'|'ORDER_CREATED'|'CAPTURING'|'CAPTURE_UNCERTAIN'|'PAID'|'FAILED';createKey:string;captureKey:string;orderId:string|null;captureId:string|null;approvalUrl:string|null;startedAt:string;updatedAt:string;captureStartedAt:string|null;error:string|null};
export class Store{
 db:DatabaseSync;
 constructor(public path:string){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY,body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS webhooks(id TEXT PRIMARY KEY,processed INTEGER NOT NULL DEFAULT 0);
 `);if(!this.db.prepare('PRAGMA table_info(webhooks)').all().some(x=>x.name==='processed'))this.db.exec('ALTER TABLE webhooks ADD COLUMN processed INTEGER NOT NULL DEFAULT 0');}
 atomic<T>(fn:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 record(id:string):StoredRecord|undefined{const row=this.db.prepare('SELECT body FROM records WHERE id=?').get(id);return row?JSON.parse(row.body as string):undefined;}
 records():StoredRecord[]{return this.db.prepare('SELECT body FROM records ORDER BY id').all().map(x=>JSON.parse(x.body as string));}
 putRecord(r:StoredRecord){this.db.prepare('INSERT INTO records VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(r.record.id,JSON.stringify(r));}
 payment(id:string):Payment|undefined{const row=this.db.prepare('SELECT body FROM payments WHERE id=?').get(id);return row?JSON.parse(row.body as string):undefined;}
 payments():Payment[]{return this.db.prepare('SELECT body FROM payments ORDER BY id').all().map(x=>JSON.parse(x.body as string));}
 putPayment(p:Payment){this.db.prepare('INSERT INTO payments VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(p.recordId,JSON.stringify(p));}
 events():AuditEvent[]{return this.db.prepare('SELECT body FROM events ORDER BY seq').all().map(x=>JSON.parse(x.body as string));}
 append(type:string,recordId:string|null,data:unknown){const row=this.db.prepare('SELECT body FROM events ORDER BY seq DESC LIMIT 1').get();const prev:AuditEvent|undefined=row?JSON.parse(row.body as string):undefined;const body={seq:(prev?.seq??0)+1,at:new Date().toISOString(),type,recordId,data,previous:prev?.hash??'0'.repeat(64)};const e={...body,hash:eventHash(body)};this.db.prepare('INSERT INTO events VALUES (?,?)').run(e.seq,JSON.stringify(e));return e;}
 session(hash:string,expires:number){this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash,expires);}
 authenticated(hash:string){return !!this.db.prepare('SELECT hash FROM sessions WHERE hash=? AND expires>?').get(hash,Date.now());}
 logout(hash:string){this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash);}
 webhookSeen(id:string){return !!this.db.prepare('SELECT id FROM webhooks WHERE id=?').get(id);}
 markWebhook(id:string){this.db.prepare('INSERT INTO webhooks(id) VALUES (?) ON CONFLICT(id) DO NOTHING').run(id);}
 webhookProcessed(id:string){return !!this.db.prepare('SELECT id FROM webhooks WHERE id=? AND processed=1').get(id);}
 markWebhookProcessed(id:string){this.db.prepare('UPDATE webhooks SET processed=1 WHERE id=?').run(id);}
 close(){this.db.close();}
}
