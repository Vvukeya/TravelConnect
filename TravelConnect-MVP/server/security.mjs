import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export class ApiError extends Error {
 constructor(status,message) { super(message); this.status=status; }
}
export const iso=()=>new Date().toISOString();
export const safeString=(v,max=100)=>typeof v==='string' ? v.trim().slice(0,max) : '';
export const must=(test,message,status=400)=>{ if(!test) throw new ApiError(status,message); };
export function passwordRecord(password) {
 const salt=randomBytes(24).toString('hex');
 return { salt, hash:scryptSync(password,salt,64).toString('hex') };
}
export function passwordValid(password,salt,hash) {
 try {const expected=Buffer.from(hash,'hex');const actual=scryptSync(password,salt,expected.length);return expected.length===actual.length && timingSafeEqual(expected,actual);} catch{return false;}
}
export function hashToken(token){return createHash('sha256').update(token).digest('hex');}
export function randomToken(){return randomBytes(40).toString('hex');}
export function parseCookies(raw=''){
 return Object.fromEntries(raw.split(';').map(chunk=>{const i=chunk.indexOf('=');return i<0 ? null : [chunk.slice(0,i).trim(),chunk.slice(i+1).trim()]}).filter(Boolean));
}
export function normalizeEmail(v){const email=safeString(v,254).toLowerCase();must(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254,'Use a valid email address');return email;}
export function validName(v){const n=safeString(v,70);must(n.length>=2,'Display name must have at least two characters');return n;}
export function validPassword(v){must(typeof v==='string'&&v.length>=10&&v.length<=128,'Password must contain 10 to 128 characters');return v;}
export function integer(v,min,max,label){const n=Number(v);must(Number.isSafeInteger(n)&&n>=min&&n<=max,`${label} must be between ${min} and ${max}`);return n;}
export function uuid(v){return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);}
export function validateDate(v){must(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v,'Use a valid travel date');
 const zaNow=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'});
 must(v>=zaNow,'Travel date cannot be in the past');return v;}
export function validateTime(v){must(typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v),'Use an HH:MM departure time');return v;}

export function nowJohannesburg(){const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});const parts=Object.fromEntries(fmt.formatToParts(new Date()).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`}}
