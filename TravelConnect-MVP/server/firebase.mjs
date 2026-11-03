/**
 * Firebase Authentication ID-token verification using only Node's built-in crypto.
 * The browser gets the Firebase web config, never a service account/private key.
 * Tokens are checked against Google's Firebase SecureToken public certificates.
 * Reference: https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
import {createPublicKey, X509Certificate, verify as verifySignature} from 'node:crypto';

const CERTIFICATES='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
function apiError(status,message){return Object.assign(new Error(message),{status})}
function decodeSegment(data){
 try{return JSON.parse(Buffer.from(data,'base64url').toString('utf8'))}
 catch{throw apiError(401,'Invalid Google authentication token')}
}

export function createFirebaseVerifier({
 projectId=process.env.TC_FIREBASE_PROJECT_ID||'',
 apiKey=process.env.TC_FIREBASE_API_KEY||'',
 authDomain=process.env.TC_FIREBASE_AUTH_DOMAIN||'',
 appId=process.env.TC_FIREBASE_APP_ID||'',
 messagingSenderId=process.env.TC_FIREBASE_MESSAGING_SENDER_ID||'',
 fetchImpl=fetch,
 now=()=>Date.now(),
 certificatesUrl=CERTIFICATES
}={}){
 const enabled=Boolean(projectId&&apiKey&&authDomain&&appId);
 let cache={certs:null,until:0};
 async function certificates(){
  if(cache.certs&&cache.until>now())return cache.certs;
  let response;
  try{response=await fetchImpl(certificatesUrl,{signal:AbortSignal.timeout(7000)});}
  catch{throw apiError(503,'Google sign-in verification is temporarily unavailable')}
  if(!response.ok)throw apiError(503,'Google sign-in verification is temporarily unavailable');
  let certs;
  try{certs=await response.json()}catch{throw apiError(503,'Google certificates are unavailable')}
  if(!certs || typeof certs!=='object' || !Object.keys(certs).length)throw apiError(503,'Google certificates are unavailable');
  const maxAge=Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers?.get?.('cache-control')||'')?.[1]||300);
  cache={certs,until:now()+Math.min(Math.max(maxAge,30),86400)*1000};
  return cache.certs;
 }
 async function verifyIdToken(token){
  if(!enabled)throw apiError(503,'Google sign-in is not configured');
  if(typeof token!=='string'||token.length>8192||!token.match(/^[\w-]+\.[\w-]+\.[\w-]+$/))throw apiError(401,'Invalid Google authentication token');
  const [encodedHeader,encodedPayload,encodedSignature]=token.split('.');
  const header=decodeSegment(encodedHeader),payload=decodeSegment(encodedPayload);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||header.kid.length>120)throw apiError(401,'Invalid Google authentication token');
  const seconds=Math.floor(now()/1000);
  if(payload.aud!==projectId || payload.iss!==`https://securetoken.google.com/${projectId}` ||
     typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128 ||
     !Number.isFinite(payload.exp)||payload.exp<=seconds ||
     !Number.isFinite(payload.iat)||payload.iat>seconds ||
     !Number.isFinite(payload.auth_time)||payload.auth_time>seconds ||
     payload.email_verified!==true ||
     !payload.firebase || payload.firebase.sign_in_provider!=='google.com' ||
     typeof payload.email!=='string')throw apiError(401,'Google identity verification failed');
  const certs=await certificates();
  if(!Object.hasOwn(certs,header.kid))throw apiError(401,'Google signature verification failed');
  let signed=false;
  try{
   const pem=certs[header.kid];
   const pubkey=pem.includes('BEGIN CERTIFICATE')?new X509Certificate(pem).publicKey:createPublicKey(pem);
   signed=verifySignature('RSA-SHA256',Buffer.from(`${encodedHeader}.${encodedPayload}`),pubkey,Buffer.from(encodedSignature,'base64url'));
  }catch{signed=false}
  if(!signed)throw apiError(401,'Google signature verification failed');
  return {uid:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:''};
 }
 return {
  enabled,
  publicConfig:enabled?{apiKey,authDomain,projectId,appId,...(messagingSenderId?{messagingSenderId}:{})}:null,
  verifyIdToken
 };
}
export const firebaseVerifier=createFirebaseVerifier();
