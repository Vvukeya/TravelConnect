/* Safe, credential-free diagnostics. Never print password or API keys. */
import {createAiService} from '../server/ai.mjs';
import {getFirebaseRuntimeConfig} from '../server/firebase-public-config.mjs';
const present=k=>Boolean(process.env[k]?.trim());
console.log('TravelConnect setup diagnostic — NO secret values displayed');
const config=getFirebaseRuntimeConfig();
console.log('  Firebase source:',process.env.TC_FIREBASE_USE_ENV==='1'?'explicit environment override':'bundled TravelConnect Web app');
console.log('  Firebase project:',config.projectId||'(missing)');
console.log('  Google sign-in configuration:',config.projectId&&config.apiKey&&config.authDomain&&config.appId?'Loaded — Google provider and authorized domain still require a real sign-in test':'Incomplete');
console.log('  Note: Firebase Web API key is deliberately not displayed.');
const ai=createAiService();
console.log(`  TripAI provider: ${ai.provider||'invalid configuration'} (${ai.model})`);
const status=await ai.status();
console.log(`  TripAI available now: ${status.enabled?'YES':'NO'}`);
if(status.message)console.log(`  Action: ${status.message}`);
if(ai.provider==='Ollama')console.log('  Cost: local model; no per-message AI API charges. Your Mac must be running.');
if(ai.provider==='Gemini')console.log('  Cost: Gemini free tier subject to usage caps and provider data policy. No paid tier required.');
if(ai.provider==='OpenAI')console.log('  Note: OpenAI API is a separately billed provider. Switch TC_AI_PROVIDER=ollama if you want free local AI.');
