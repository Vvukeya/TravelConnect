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
 assert.equal(wrong.ready,false);assert.match(wrong.issues.join(' '),/Web API key belongs/);assert.match(wrong.issues.join(' '),/different/);assert.match(wrong.issues.join(' '),/tc-test/);
 const blocked=await inspectFirebase({...base,fetchImpl:reply(403,{error:{message:'API_KEY_SERVICE_BLOCKED: key public-fixture'}})});
 assert.equal(blocked.status,'rejected');assert.match(blocked.issues.join(' '),/restriction/);
 assert.doesNotMatch(JSON.stringify(blocked),/public-fixture/);
});
test('Firebase setup handles network outage as unverified, not falsely ready',async()=>{
 const x=await inspectFirebase({...base,fetchImpl:async()=>{throw Error('offline')}});
 assert.equal(x.status,'unavailable');assert.equal(x.ready,false);
});

test('Firebase preflight compares numerical Firebase project number with Web app sender ID, not textual project ID',async()=>{
 const conf={projectId:'travelconnect-f359e',apiKey:'fixture-public-key',authDomain:'travelconnect-f359e.firebaseapp.com',appId:'1:276817834548:web:bd903dfab8ea6562ccd061',messagingSenderId:'276817834548',hostname:'localhost'};
 const response=await inspectFirebase({...conf,fetchImpl:reply(200,{projectId:'276817834548',authorizedDomains:['localhost','travelconnect-f359e.firebaseapp.com']})});
 assert.equal(response.ready,true);
 assert.equal(response.status,'ready');
 assert.equal(response.projectIdentityCheck,'matched');
 assert.equal(response.authorizedDomainCheck,'allowed');
 assert.doesNotMatch(response.issues.join(' '),/different Firebase project|project number mismatch/);
});
test('Firebase preflight detects numerical project mismatch without showing Web API keys',async()=>{
 const config={projectId:'travelconnect-f359e',apiKey:'fixture-public-key',authDomain:'travelconnect-f359e.firebaseapp.com',appId:'1:276817834548:web:bd903dfab8ea6562ccd061',hostname:'localhost'};
 const response=await inspectFirebase({...config,fetchImpl:reply(200,{projectId:'987654321000',authorizedDomains:['localhost','travelconnect-f359e.firebaseapp.com']})});
 assert.equal(response.status,'action-required');
 assert.equal(response.projectIdentityCheck,'mismatch');
 assert.match(response.issues.join(' '),/project number mismatch/);
 assert.doesNotMatch(JSON.stringify(response),/fixture-public-key/);
});
