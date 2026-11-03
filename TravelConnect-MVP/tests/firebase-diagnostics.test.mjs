import test from 'node:test';import assert from 'node:assert/strict';
import {inspectFirebase} from '../server/firebase-diagnostics.mjs';
const base={projectId:'tc-test',apiKey:'public-fixture',authDomain:'tc-test.firebaseapp.com',appId:'1:123:web:test',hostname:'localhost'};
const reply=(status,obj)=>async()=>({ok:status===200,status,json:async()=>obj});
test('Firebase setup reports missing configuration without external requests',async()=>{
 const x=await inspectFirebase({});assert.equal(x.status,'incomplete');assert.equal(x.ready,false);
 assert.doesNotMatch(JSON.stringify(x),/private-key/);
});
test('Firebase setup detects an unauthorized development domain',async()=>{
 const x=await inspectFirebase({...base,fetchImpl:reply(200,{projectId:'tc-test',authorizedDomains:['tc-test.firebaseapp.com']})});
 assert.equal(x.status,'action-required');assert.equal(x.ready,false);assert.match(x.issues.join(' '),/localhost/);
});
test('Firebase setup accepts localhost when the public project is consistent',async()=>{
 const x=await inspectFirebase({...base,fetchImpl:reply(200,{projectId:'tc-test',authorizedDomains:['localhost','tc-test.firebaseapp.com']})});
 assert.equal(x.status,'ready');assert.equal(x.ready,true);
 assert.doesNotMatch(JSON.stringify(x),/public-fixture/);
 assert.equal(x.provider,'unverified');
});
test('Firebase setup reports wrong project and blocked credentials safely',async()=>{
 const wrong=await inspectFirebase({...base,fetchImpl:reply(200,{projectId:'different',authorizedDomains:['localhost']})});
 assert.equal(wrong.ready,false);assert.match(wrong.issues.join(' '),/different Firebase project/);
 const blocked=await inspectFirebase({...base,fetchImpl:reply(403,{error:{message:'API_KEY_SERVICE_BLOCKED: key public-fixture'}})});
 assert.equal(blocked.status,'rejected');assert.match(blocked.issues.join(' '),/restriction/);
 assert.doesNotMatch(JSON.stringify(blocked),/public-fixture/);
});
test('Firebase setup handles network outage as unverified, not falsely ready',async()=>{
 const x=await inspectFirebase({...base,fetchImpl:async()=>{throw Error('offline')}});
 assert.equal(x.status,'unavailable');assert.equal(x.ready,false);
});
