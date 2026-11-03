import test from 'node:test';
import assert from 'node:assert/strict';
import {getFirebaseRuntimeConfig,travelConnectFirebaseWebConfig} from '../server/firebase-public-config.mjs';
import {createFirebaseVerifier} from '../server/firebase.mjs';

test('TravelConnect uses a single consistent public Firebase Web app by default',()=>{
 const stale={
  TC_FIREBASE_PROJECT_ID:'unrelated-project',
  TC_FIREBASE_API_KEY:'an-unrelated-api-key',
  TC_FIREBASE_AUTH_DOMAIN:'unrelated-project.firebaseapp.com',
  TC_FIREBASE_APP_ID:'1:111:web:other',
  TC_FIREBASE_MESSAGING_SENDER_ID:'111'
 };
 const active=getFirebaseRuntimeConfig(stale);
 assert.equal(active.projectId,'travelconnect-f359e');
 assert.equal(active.authDomain,`${active.projectId}.firebaseapp.com`);
 assert.equal(active.appId,travelConnectFirebaseWebConfig.appId);
 assert.equal(active.messagingSenderId,'276817834548');
 assert.equal(active.storageBucket,'travelconnect-f359e.firebasestorage.app');
 assert.equal(active.measurementId,'G-P0M0GJ4W1J');
 assert.ok(active.apiKey.startsWith('AIza'));
});

test('Firebase environment overrides must be intentionally enabled for deployment',()=>{
 const env={
  TC_FIREBASE_USE_ENV:'1',
  TC_FIREBASE_PROJECT_ID:'test-deployment',
  TC_FIREBASE_API_KEY:'test-web-identifier',
  TC_FIREBASE_AUTH_DOMAIN:'test-deployment.firebaseapp.com',
  TC_FIREBASE_APP_ID:'1:123:web:abcdef',
  TC_FIREBASE_MESSAGING_SENDER_ID:'123'
 };
 const active=getFirebaseRuntimeConfig(env);
 assert.equal(active.projectId,'test-deployment');
 assert.equal(active.apiKey,'test-web-identifier');
 const defaultConfig=getFirebaseRuntimeConfig({...env,TC_FIREBASE_USE_ENV:'0'});
 assert.equal(defaultConfig.projectId,'travelconnect-f359e');
});

test('Firebase token-verifier can use the same chosen public config without role escalation',()=>{
 const config=getFirebaseRuntimeConfig({});
 const verifier=createFirebaseVerifier({...config});
 assert.equal(verifier.enabled,true);
 assert.equal(verifier.publicConfig.projectId,config.projectId);
 assert.equal(verifier.publicConfig.appId,config.appId);
 assert.equal(Object.hasOwn(verifier.publicConfig,'privateKey'),false);
});
