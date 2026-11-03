/** Optional real trip-planning LLM integration. No credentials ever reach the browser. */
const SYSTEM=`You are TripAI, a concise South African trip-planning assistant inside TravelConnect.
Give useful general planning and travelling information, in clear English. You have no direct access to live driver positions, real booking availability, passenger data, emergency dispatch, or payment systems.
Never assert that a trip is booked, paid for, driver-verified, or safe. For actual availability, direct people to TravelConnect's Find rides page. Never invent ticket prices, exact departures or emergency service responses. Explain uncertainty. Do not request personal identifying details or payment card data. Weather should be checked using TravelConnect's Weather page; do not invent live forecasts. Responses should be practical and under 170 words.`;
export function createAiService({fetchImpl=fetch,apiKey=process.env.TC_OPENAI_API_KEY||'',model=process.env.TC_AI_MODEL||'gpt-6-luna'}={}){
 return {
  enabled:Boolean(apiKey),
  async ask(question){
   if(!apiKey)throw Object.assign(new Error('TripAI provider is not configured'),{status:503});
   if(typeof question!=='string'||question.trim().length<2||question.length>500)throw Object.assign(new Error('Ask a question between 2 and 500 characters'),{status:400});
   let res;
   try{
    res=await fetchImpl('https://api.openai.com/v1/responses',{
      method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(16000),
      body:JSON.stringify({model,instructions:SYSTEM,input:[{role:'user',content:question.trim()}],max_output_tokens:380,store:false})
    });
   }catch{throw Object.assign(new Error('TripAI provider is temporarily unavailable'),{status:503})}
   if(!res.ok)throw Object.assign(new Error('TripAI provider request was unsuccessful'),{status:503});
   let data;try{data=await res.json()}catch{throw Object.assign(new Error('TripAI returned invalid data'),{status:503})}
   const response=data.output_text||data.output?.filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('\n');
   if(typeof response!=='string'||!response.trim())throw Object.assign(new Error('TripAI did not return a response'),{status:503});
   return {reply:response.trim().slice(0,2400),provider:'OpenAI',model};
  }
 }
}
export const aiService=createAiService();
