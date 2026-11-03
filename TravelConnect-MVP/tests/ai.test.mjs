import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiService} from '../server/ai.mjs';

test('unconfigured live TripAI is disabled, without accidental calls',async()=>{
 const ai=createAiService({provider:'openai',apiKey:''});assert.equal(ai.enabled,false);
 await assert.rejects(()=>ai.ask('What should I pack?'),{status:503});
});
test('configured TripAI sends server-side credential and limits output',async()=>{
 let seen;
 const ai=createAiService({provider:'openai',apiKey:'private-test-key',model:'test-model',fetchImpl:async(url,options)=>{seen={url,options};return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Check the forecast before you travel.'}]}]})}}});
 const response=await ai.ask('Help me prepare for tomorrow');
 assert.equal(response.provider,'OpenAI');assert.equal(response.reply,'Check the forecast before you travel.');
 assert.equal(seen.url,'https://api.openai.com/v1/responses');
 assert.equal(seen.options.headers.Authorization,'Bearer private-test-key');
 const body=JSON.parse(seen.options.body);assert.equal(body.store,false);assert.match(body.instructions,/Never assert that a trip is booked/);
 await assert.rejects(()=>ai.ask('x'),{status:400});
});
test('AI errors are clear and never produce invented responses',async()=>{
 const ai=createAiService({provider:'openai',apiKey:'private-test-key',fetchImpl:async()=>({ok:false})});
 await assert.rejects(()=>ai.ask('Hello there'),{status:503});
});
