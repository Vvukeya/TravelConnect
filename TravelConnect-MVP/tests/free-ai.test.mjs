import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiService} from '../server/ai.mjs';
const ok=json=>({ok:true,json:async()=>json});
test('Ollama local AI sends no paid API key and returns actual generated text',async()=>{
 let sent;
 const service=createAiService({provider:'ollama',ollamaModel:'qwen3:1.7b',apiKey:'unused-paid-openai-key',fetchImpl:async(url,options)=>{
  sent={url,options};return ok({message:{content:'Take water and check the weather before departure.'}})
 }});
 assert.equal(service.enabled,true);assert.equal(service.provider,'Ollama');
 const reply=await service.ask('What should I pack for a road trip?');
 assert.equal(reply.provider,'Ollama');assert.equal(reply.reply,'Take water and check the weather before departure.');
 assert.equal(sent.url,'http://127.0.0.1:11434/api/chat');
 assert.equal(sent.options.headers.Authorization,undefined);
 const body=JSON.parse(sent.options.body);
 assert.equal(body.model,'qwen3:1.7b');assert.equal(body.stream,false);assert.equal(body.think,false);
 assert.equal(body.messages[0].role,'system');assert.equal(body.messages[1].role,'user');
 assert.equal(sent.options.body.includes('unused-paid-openai-key'),false);
});
test('Local Ollama model status checks whether selected model is installed',async()=>{
 const installed=createAiService({provider:'ollama',fetchImpl:async()=>ok({models:[{name:'qwen3:1.7b'}]})});
 assert.equal((await installed.status()).enabled,true);
 const missing=createAiService({provider:'ollama',fetchImpl:async()=>ok({models:[{name:'qwen3:4b'}]})});
 const status=await missing.status();assert.equal(status.enabled,false);assert.match(status.message,/ollama pull/);
 const offline=createAiService({provider:'ollama',fetchImpl:async()=>{throw Error('connection refused')}});
 assert.match((await offline.status()).message,/offline/);
 await assert.rejects(()=>offline.ask('Help me plan a trip'),e=>e.status===503&&/Ollama/.test(e.safeClientMessage));
});
test('Ollama missing model provides clear install command',async()=>{
 const svc=createAiService({provider:'ollama',fetchImpl:async()=>({ok:false,status:404})});
 await assert.rejects(()=>svc.ask('Hello there'),e=>e.status===503&&/ollama pull qwen3:1.7b/.test(e.message));
});
test('Gemini free-tier REST requests use server key and no OpenAI calls',async()=>{
 let called;
 const svc=createAiService({provider:'gemini',geminiKey:'fake-gemini-private',fetchImpl:async(url,options)=>{called={url,options};return ok({candidates:[{content:{parts:[{text:'You can travel from Johannesburg to Durban.'}]}}]})}});
 assert.equal(svc.enabled,true);const reply=await svc.ask('Plan a trip from Johannesburg to Durban');
 assert.equal(reply.provider,'Gemini');assert.match(reply.reply,/Johannesburg/);
 assert.match(called.url,/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2.5-flash-lite:generateContent$/);
 assert.equal(called.options.headers['x-goog-api-key'],'fake-gemini-private');
 const body=JSON.parse(called.options.body);assert.match(body.systemInstruction.parts[0].text,/TripAI/);
 assert.match(body.contents[0].parts[0].text,/Johannesburg/);
 assert.equal(called.options.body.includes('fake-gemini-private'),false);
});
test('Gemini free-tier quota error is clear; unconfigured mode makes no requests',async()=>{
 const quota=createAiService({provider:'gemini',geminiKey:'fake',fetchImpl:async()=>({ok:false,status:429})});
 await assert.rejects(()=>quota.ask('Hi there'),e=>e.status===429&&/free-tier/.test(e.safeClientMessage));
 const none=createAiService({provider:'gemini',geminiKey:'',fetchImpl:async()=>{throw Error('must not fetch')}});
 assert.equal((await none.status()).enabled,false);
 await assert.rejects(()=>none.ask('Hi there'),{status:503});
});
