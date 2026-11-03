import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiService} from '../server/ai.mjs';
function provider(status,code){return createAiService({provider:'openai',apiKey:'sk-test-secret',fetchImpl:async()=>({ok:false,status,json:async()=>({error:{code,message:'UPSTREAM_PRIVATE_SECRET_SHOULD_NOT_APPEAR'}})})});}
test('OpenAI invalid key produces an actionable error without leaking upstream details',async()=>{
 await assert.rejects(provider(401,'invalid_api_key').ask('hello'),err=>err.status===401&&/API key/.test(err.message)&&!/PRIVATE_SECRET/.test(err.message));
});
test('OpenAI insufficient quota produces a billing hint',async()=>{
 await assert.rejects(provider(429,'insufficient_quota').ask('hello'),err=>err.status===429&&/credits|quota/.test(err.message));
});
test('OpenAI unavailable model produces a model-setting hint',async()=>{
 await assert.rejects(provider(404,'model_not_found').ask('hello'),err=>err.status===400&&/TC_AI_MODEL/.test(err.message));
});
test('OpenAI upstream 500 produces only a safe service message',async()=>{
 await assert.rejects(provider(500,'internal_error').ask('hello'),err=>err.status===503&&err.safeClientMessage&&!/PRIVATE_SECRET/.test(err.message));
});
