/**
 * Firebase setup preflight. Uses the public Identity Toolkit project endpoint.
 * Never prints or returns the Web API key, user identities or OAuth tokens.
 * A successful preflight cannot prove that Google OAuth is enabled; this still
 * requires a real browser sign-in and checking the Firebase Console.
 */
const endpoint = 'https://identitytoolkit.googleapis.com/v1/projects';
const hints = {
 API_KEY_INVALID:'The Firebase Web API key is invalid. Copy the apiKey from Firebase Project settings → Your apps.',
 API_KEY_SERVICE_BLOCKED:'Firebase Authentication is blocked by this Google Cloud API key restriction. Allow Identity Toolkit API.',
 API_KEY_HTTP_REFERRER_BLOCKED:'The API key restrictions block this request. Check the Browser key restrictions in Google Cloud.',
 PROJECT_NOT_FOUND:'No Firebase Authentication project matches this key. Check that the Web app belongs to your TravelConnect project.',
 PERMISSION_DENIED:'Google rejected the project configuration request. Check that Firebase Authentication is enabled and the API key has correct restrictions.',
 INVALID_ARGUMENT:'Firebase rejected the Web API key or project configuration.'
};
const short=s=>String(s||'').trim().slice(0,140);
export async function inspectFirebase({projectId='',apiKey='',authDomain='',appId='',hostname='localhost',fetchImpl=fetch}={}){
 const issues=[];
 if(!projectId||!apiKey||!authDomain||!appId) return {status:'incomplete',ready:false,projectId:short(projectId),hostname:short(hostname),issues:['Firebase Web app config is incomplete. Set the five TC_FIREBASE_* values in .env and restart the server.'],provider:'unverified'};
 const expected=`${projectId}.firebaseapp.com`;
 if(authDomain.endsWith('.firebaseapp.com') && authDomain!==expected){
  issues.push(`The authDomain "${short(authDomain)}" does not match your configured project. Copy the authDomain from Firebase Project settings → Your apps.`);
 } else if(authDomain!==expected && authDomain!==`${projectId}.web.app`) {
  issues.push('Custom authDomain detected. Confirm it is registered in your Firebase project and is authorized for OAuth.');
 }
 let response;
 try {response=await fetchImpl(`${endpoint}?key=${encodeURIComponent(apiKey)}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(7000)});}
 catch {return {status:'unavailable',ready:false,projectId:short(projectId),hostname:short(hostname),issues:[...issues,'Cannot reach Firebase settings right now. Check your internet connection and retry.'],provider:'unverified'};}
 let payload={};try{payload=await response.json()}catch{}
 if(!response.ok){
  const code=short(payload?.error?.status||payload?.error?.message||'');
  const hint=Object.entries(hints).find(([k])=>code.includes(k))?.[1]||'Firebase rejected the configuration check. Confirm the Web app API key and Firebase Authentication setup.';
  return {status:'rejected',ready:false,projectId:short(projectId),hostname:short(hostname),issues:[...issues,hint],provider:'unverified'};
 }
 const actual=payload.projectId||payload.project_id||'';
 if(actual && actual!==projectId)issues.push(`Firebase Web API key belongs to project "${short(actual)}" but TC_FIREBASE_PROJECT_ID is "${short(projectId)}". Copy all five TC_FIREBASE_* values from the SAME Web app in Firebase Project settings → General → Your apps.`);
 const domains=Array.isArray(payload.authorizedDomains)?payload.authorizedDomains:[];
 if(domains.length && !domains.includes(hostname))issues.push(`The current domain (${short(hostname)}) is not authorized. Firebase → Authentication → Settings → Authorized domains → Add domain.`);
 if(domains.length && !domains.includes(authDomain))issues.push('The authDomain is missing from Firebase Authorized domains. Verify Firebase project setup.');
 const fatal=issues.some(m=>/Firebase Web API key belongs|does not match your configured project|not authorized|authDomain is missing/.test(m));
 return {status:fatal?'action-required':issues.length?'warning':'ready',ready:!fatal,projectId:short(projectId),hostname:short(hostname),issues,authorizedDomainCheck:domains.length?(domains.includes(hostname)?'allowed':'blocked'):'unavailable',provider:'unverified',help:'Also enable Google in Firebase Authentication → Sign-in method. Browser OAuth must be tested with a real Google account.'};
}
const CACHE_MS=120000;
let cache=new Map();
export async function publicFirebaseDiagnostics(hostname='localhost',config=process.env){
 const key=String(hostname||'localhost').split(':')[0].toLowerCase().slice(0,160);
 const now=Date.now();const prior=cache.get(key);if(prior&&prior.until>now)return prior.promise;
 const promise=inspectFirebase({projectId:config.TC_FIREBASE_PROJECT_ID||'',apiKey:config.TC_FIREBASE_API_KEY||'',authDomain:config.TC_FIREBASE_AUTH_DOMAIN||'',appId:config.TC_FIREBASE_APP_ID||'',hostname:key});
 cache.set(key,{promise,until:now+CACHE_MS});return promise;
}
