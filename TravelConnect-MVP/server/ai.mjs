/** TravelConnect TripAI providers: free local Ollama (default), Gemini free tier, optional OpenAI.
 * All calls originate from this server; secrets never reach the website. */
const SYSTEM=`You are TripAI, a concise South African trip-planning assistant inside TravelConnect.
Give useful general planning and travelling information, in clear English. You have no direct access to live driver positions, real booking availability, passenger data, emergency dispatch, or payment systems.
Never assert that a trip is booked, paid for, driver-verified, or safe. For actual availability, direct people to TravelConnect's Find rides page. Never invent ticket prices, exact departures or emergency service responses. Explain uncertainty. Do not request personal identifying details or payment card data. Weather should be checked using TravelConnect's Weather page; do not invent live forecasts. Responses should be practical and under 170 words.`;
const OLLAMA='http://127.0.0.1:11434';
const fail=(status,message)=>Object.assign(new Error(message),{status,safeClientMessage:message});
function openaiError(status,code=''){
 const c=String(code).toLowerCase();let message='TripAI could not reach OpenAI. Please try again shortly.',s=503;
 if(status===401){s=401;message='TripAI API authentication failed. The site owner should check their OpenAI API key.';}
 else if(status===403){s=403;message='TripAI is not allowed to use the selected OpenAI model or project. Check API permissions.';}
 else if(status===404||c==='model_not_found'){s=400;message='TripAI model is not available to this API project. Check TC_AI_MODEL.';}
 else if(status===429&&/quota|billing|credit/.test(c)){s=429;message='TripAI API credits or quota are unavailable. Check OpenAI Platform Billing and Usage.';}
 else if(status===429){s=429;message='TripAI request limit reached. Please try again later, or check API usage and billing.';}
 else if(status===400){s=400;message='TripAI request was rejected. Check the selected model and API project permissions.';}
 return fail(s,message);
}
function geminiError(status){
 if(status===400)return fail(400,'Gemini rejected the request. Check TC_GEMINI_MODEL.');
 if(status===401||status===403)return fail(503,'Gemini free-tier key or project permission is invalid. Check Google AI Studio and the API key settings.');
 if(status===404)return fail(503,'The selected Gemini model is unavailable. Check TC_GEMINI_MODEL in .env.');
 if(status===429)return fail(429,'Gemini free-tier request limit reached. Try again after the quota resets. No paid upgrade is required.');
 return fail(503,'Gemini is temporarily unavailable. Try again later.');
}
const readJson=async(res)=>{try{return await res.json()}catch{throw fail(503,'The AI provider returned invalid data. Try again.')}};
const validQuestion=q=>{if(typeof q!=='string'||q.trim().length<2||q.length>500)throw fail(400,'Ask a question between 2 and 500 characters');return q.trim()};
const result=(reply,provider,model)=>{if(typeof reply!=='string'||!reply.trim())throw fail(503,`${provider} returned no text. Try another question or check the model settings.`);return {reply:reply.trim().slice(0,2400),provider,model}};
function networkFailure(provider,error){const m=error?.name==='TimeoutError'?`${provider} took too long. A smaller model may run faster.`:provider==='Ollama'?'Cannot connect to free local Ollama. Open the Ollama app on your Mac and run: ollama pull qwen3:1.7b':`${provider} could not be reached. Check your internet connection.`;return fail(503,m)}
export function createAiService({
 fetchImpl=fetch,
 provider=process.env.TC_AI_PROVIDER||'ollama',
 ollamaModel=process.env.TC_OLLAMA_MODEL||'qwen3:1.7b',
 geminiKey=process.env.TC_GEMINI_API_KEY||'',
 geminiModel=process.env.TC_GEMINI_MODEL||'gemini-2.5-flash-lite',
 apiKey=process.env.TC_OPENAI_API_KEY||'',
 model=process.env.TC_AI_MODEL||'gpt-5.4-mini'
}={}){
 provider=String(provider).trim().toLowerCase();
 const providerName={ollama:'Ollama',gemini:'Gemini',openai:'OpenAI'}[provider]||null;
 const chosenModel=provider==='ollama'?ollamaModel:provider==='gemini'?geminiModel:model;
 const enabled=provider==='ollama'||(provider==='gemini'&&Boolean(geminiKey))||(provider==='openai'&&Boolean(apiKey));
 return {
  enabled,provider:providerName,model:chosenModel,
  /** Reports actual local model readiness instead of showing a fake 'AI connected' indicator. */
  async status(){
   if(provider!=='ollama')return {enabled:Boolean(enabled),provider:providerName,model:chosenModel,message:enabled?'':provider==='gemini'?'Add TC_GEMINI_API_KEY from Google AI Studio to .env.':'Choose Ollama for no-key local AI or configure your selected provider.'};
   try{
    const res=await fetchImpl(`${OLLAMA}/api/tags`,{signal:AbortSignal.timeout(1600)});
    if(!res.ok)throw Error('Ollama status unavailable');
    const data=await res.json();
    const installed=Array.isArray(data.models)&&data.models.some(item=>item.name===ollamaModel||item.model===ollamaModel);
    return {enabled:installed,provider:'Ollama',model:chosenModel,message:installed?'':'Ollama is running, but the model is missing. In Terminal run: ollama pull '+ollamaModel};
   }catch{return {enabled:false,provider:'Ollama',model:chosenModel,message:'Free local AI is offline. Open Ollama on your Mac, then run: ollama pull '+ollamaModel}}
  },
  async ask(question){
   question=validQuestion(question);
   if(!enabled)throw fail(503,'TripAI is not configured. To use free AI, set TC_AI_PROVIDER=ollama in .env and install Ollama.');
   let res;
   if(provider==='ollama'){
    try{res=await fetchImpl(`${OLLAMA}/api/chat`,{
     method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
     body:JSON.stringify({model:ollamaModel,stream:false,think:false,keep_alive:'5m',messages:[{role:'system',content:SYSTEM},{role:'user',content:question}],options:{num_predict:320,temperature:0.35}})
    })}catch(e){throw networkFailure('Ollama',e)}
    if(!res.ok){if(res.status===404)throw fail(503,`Ollama model is not installed. Run: ollama pull ${ollamaModel}`);throw fail(503,'Ollama could not generate a reply. Check the model and available Mac memory.');}
    const data=await readJson(res);return result(data?.message?.content,'Ollama',ollamaModel);
   }
   if(provider==='gemini'){
    // Free-tier limits and regional eligibility are enforced by Google. We never enable billing here.
    const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;
    try{res=await fetchImpl(endpoint,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},signal:AbortSignal.timeout(35000),
      body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text:question}]}],generationConfig:{maxOutputTokens:360}})
    })}catch(e){throw networkFailure('Gemini',e)}
    if(!res.ok)throw geminiError(res.status);
    const data=await readJson(res);const reply=(data.candidates?.[0]?.content?.parts||[]).filter(x=>typeof x.text==='string').map(x=>x.text).join('\n');
    return result(reply,'Gemini',geminiModel);
   }
   if(provider==='openai'){
    try{res=await fetchImpl('https://api.openai.com/v1/responses',{
      method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(16000),
      body:JSON.stringify({model,instructions:SYSTEM,input:[{role:'user',content:question}],max_output_tokens:380,store:false})
    })}catch(e){throw networkFailure('OpenAI',e)}
    if(!res.ok){let code='';try{let body=await res.json();code=typeof body?.error?.code==='string'?body.error.code:''}catch{}console.warn('[TripAI OpenAI]',{httpStatus:res.status,code:code.replace(/[^a-z0-9_-]/gi,'').slice(0,60)||'unspecified'});throw openaiError(res.status,code)}
    const data=await readJson(res);
    const reply=data.output_text||data.output?.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
    return result(reply,'OpenAI',model);
   }
   throw fail(503,'Unsupported TripAI provider. Use ollama or gemini.');
  }
 }
}
export const aiService=createAiService();
