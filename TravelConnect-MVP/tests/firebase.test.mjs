import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign as cryptoSign} from 'node:crypto';
import {createFirebaseVerifier} from '../server/firebase.mjs';

const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const PUB=publicKey.export({type:'spki',format:'pem'});
const projectId='travelconnect-unit-test';
const now=()=>1730000000000;
let getCount=0;
const fetchImpl=async()=>{getCount++;return {ok:true,headers:{get:()=> 'public,max-age=3600'},json:async()=>({'test-kid':PUB})}};
const service=createFirebaseVerifier({projectId,apiKey:'web-api-test',authDomain:'travelconnect-unit-test.firebaseapp.com',appId:'1:123:web:abc',fetchImpl,now});
const signToken=(payloadChanges={},headerChanges={})=>{
 const second=Math.floor(now()/1000);
 const header={alg:'RS256',kid:'test-kid',typ:'JWT',...headerChanges};
 const payload={aud:projectId,iss:`https://securetoken.google.com/${projectId}`,sub:'firebase-uid-123',email:'person@example.test',name:'Google Traveller',email_verified:true,iat:second-10,exp:second+3600,auth_time:second-40,firebase:{sign_in_provider:'google.com'},...payloadChanges};
 const text=Buffer.from(JSON.stringify(header)).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url');
 return text+'.'+cryptoSign('RSA-SHA256',Buffer.from(text),privateKey).toString('base64url');
};
test('Google sign-in is disabled without Firebase credentials',async()=>{
 const v=createFirebaseVerifier({projectId:'',apiKey:'',authDomain:'',appId:''});
 assert.equal(v.enabled,false);assert.equal(v.publicConfig,null);
 await assert.rejects(()=>v.verifyIdToken(signToken()),{status:503});
});
test('signed Google token verifies all Firebase claims and caches public keys',async()=>{
 assert.equal(service.enabled,true);assert.equal(service.publicConfig.apiKey,'web-api-test');
 assert.equal((await service.verifyIdToken(signToken())).email,'person@example.test');
 assert.equal((await service.verifyIdToken(signToken())).uid,'firebase-uid-123');
 assert.equal(getCount,1);
});
test('Google auth rejects impersonation, wrong project, expired token and unverified email',async()=>{
 for(const v of [{aud:'wrong-project'},{email_verified:false},{exp:0},{firebase:{sign_in_provider:'password'}},{iss:'https://evil.test'}, {sub:''}])
  await assert.rejects(()=>service.verifyIdToken(signToken(v)),{status:401});
 await assert.rejects(()=>service.verifyIdToken(signToken({name:'Malicious'}, {alg:'none'})),{status:401});
 const good=signToken();const parts=good.split('.');parts[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(parts[1],'base64url').toString()),email:'attacker@example.test'})).toString('base64url');
 await assert.rejects(()=>service.verifyIdToken(parts.join('.')),{status:401});
});
