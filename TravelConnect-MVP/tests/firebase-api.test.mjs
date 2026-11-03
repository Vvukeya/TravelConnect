import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';

const temp=mkdtempSync(path.join(os.tmpdir(),'travelconnect-firebase-'));
process.env.TC_DATA_DIR=temp;
process.env.TC_FIREBASE_PROJECT_ID='travelconnect-test';
process.env.TC_FIREBASE_API_KEY='firebase-public-web-key';
process.env.TC_FIREBASE_AUTH_DOMAIN='travelconnect-test.firebaseapp.com';
process.env.TC_FIREBASE_APP_ID='1:123:web:abc';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const cert=publicKey.export({type:'spki',format:'pem'});
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://www.googleapis.com/robot/v1/metadata/x509/'))
  return {ok:true,headers:{get:()=> 'public,max-age=1800'},json:async()=>({'mock-key':cert})};
 return originalFetch(url,options);
};
const [{createServer},{db}]=await Promise.all([import('../scripts/dev.mjs'),import('../server/db.mjs')]);
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const jar={};
async function request(client,route,method='GET',body){
 const headers={'X-TravelConnect-Client':'web',Origin:origin};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(jar[client])headers.Cookie=jar[client];
 const response=await originalFetch(origin+'/api/v1'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 if(response.headers.has('set-cookie'))jar[client]=response.headers.get('set-cookie').split(';')[0];
 const data=await response.json();return {status:response.status,...data};
}
const googleToken=(email,uid)=>{
 const now=Math.floor(Date.now()/1000);
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const part=encode({alg:'RS256',kid:'mock-key'})+'.'+encode({aud:'travelconnect-test',iss:'https://securetoken.google.com/travelconnect-test',sub:uid,email,email_verified:true,name:'Actual Google Traveller',iat:now-10,auth_time:now-50,exp:now+3600,firebase:{sign_in_provider:'google.com'}});
 return part+'.'+sign('RSA-SHA256',Buffer.from(part),privateKey).toString('base64url');
};
test('Firebase API: authentic SSO creates safe accounts and explicit links',async t=>{
 const conf=await request('guest','/auth/firebase/config');
 assert.equal(conf.enabled,true);assert.equal(conf.config.projectId,'travelconnect-test');
 assert.equal(conf.config.apiKey,'firebase-public-web-key');
 assert.equal(JSON.stringify(conf).includes('secret'),false);
 let token=googleToken('verified@example.test','google-uid-001');
 const first=await request('new','/auth/google','POST',{idToken:token});
 assert.equal(first.status,200);assert.equal(first.user.email,'verified@example.test');
 assert.equal(first.user.googleLinked,true);assert.equal(first.user.role,'passenger');
 assert.equal((await request('new','/auth/me')).user.id,first.user.id);
 const back=await request('another','/auth/google','POST',{idToken:token});
 assert.equal(back.status,200);assert.equal(back.user.id,first.user.id);
 assert.equal((await request('guest','/auth/register','POST',{name:'Impersonation',email:'verified@example.test',password:'somethingverylong'})).status,409);
 const bad=token.split('.');bad[2]=(bad[2][0]==='A'?'B':'A')+bad[2].slice(1);
 assert.equal((await request('guest','/auth/google','POST',{idToken:bad.join('.')})).status,401);
 const local=await request('password','/auth/register','POST',{name:'Existing Person',email:'admin-legacy@example.test',password:'our-strong-password-2026!'});
 assert.equal(local.status,201);assert.equal(local.user.googleLinked,false);
 db.prepare("UPDATE users SET role='admin' WHERE id=?").run(local.user.id);
 token=googleToken('admin-legacy@example.test','google-uid-002');
 const collision=await request('guest','/auth/google','POST',{idToken:token});
 assert.equal(collision.status,409);assert.match(collision.error,/Sign in with your password/);
 const linked=await request('password','/auth/google','POST',{idToken:token});
 assert.equal(linked.status,200);assert.equal(linked.user.id,local.user.id);
 assert.equal(linked.user.role,'admin');assert.equal(linked.user.googleLinked,true);
 assert.equal((await request('guest','/auth/google','POST',{idToken:token})).user.role,'admin');
 const wrongSession=await request('new','/auth/google','POST',{idToken:token});
 assert.equal(wrongSession.status,409);
});
test.after(async()=>{
 await new Promise(resolve=>server.close(resolve));
 db.close();globalThis.fetch=originalFetch;rmSync(temp,{recursive:true,force:true});
});
