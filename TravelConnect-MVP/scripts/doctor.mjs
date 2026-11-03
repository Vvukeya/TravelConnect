/* Safe, credential-free diagnostics. Never print password or API keys. */
import {createAiService} from '../server/ai.mjs';
const present=k=>Boolean(process.env[k]?.trim());
console.log('TravelConnect setup diagnostic — NO secret values displayed');
const fb=['TC_FIREBASE_PROJECT_ID','TC_FIREBASE_API_KEY','TC_FIREBASE_AUTH_DOMAIN','TC_FIREBASE_APP_ID','TC_FIREBASE_MESSAGING_SENDER_ID'];
for(const k of fb)console.log(`  ${k}: ${present(k)?'present':'not configured'}`);
console.log('  Firebase Google sign-in:',fb.slice(0,4).every(present)?'Web config present — verify authorized domains and provider in Firebase Console':'Not configured (optional, separate from TripAI)');
const ai=createAiService();
console.log(`  TripAI provider: ${ai.provider||'invalid configuration'} (${ai.model})`);
const status=await ai.status();
console.log(`  TripAI available now: ${status.enabled?'YES':'NO'}`);
if(status.message)console.log(`  Action: ${status.message}`);
if(ai.provider==='Ollama')console.log('  Cost: local model; no per-message AI API charges. Your Mac must be running.');
if(ai.provider==='Gemini')console.log('  Cost: Gemini free tier subject to usage caps and provider data policy. No paid tier required.');
if(ai.provider==='OpenAI')console.log('  Note: OpenAI API is a separately billed provider. Switch TC_AI_PROVIDER=ollama if you want free local AI.');
