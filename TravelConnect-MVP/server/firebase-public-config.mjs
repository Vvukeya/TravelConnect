/**
 * Public Firebase Web App configuration for the TravelConnect project.
 * Firebase web apiKey/appId/projectId are app identifiers, NOT service-account
 * credentials. Protect Firebase usage with API restrictions and project rules.
 *
 * The Mac may still have stale TC_FIREBASE_* entries from an earlier project.
 * To prevent accidentally mixing project credentials, the bundled values are
 * authoritative unless TC_FIREBASE_USE_ENV=1 is explicitly set.
 *
 * Never put Firebase Admin private keys or privileged OAuth secrets here.
 */
export const travelConnectFirebaseWebConfig=Object.freeze({
 apiKey:'AIzaSyBY-l3sCCUKpBjBJdWNd1sv6WCxHdyaKzY',
 authDomain:'travelconnect-f359e.firebaseapp.com',
 projectId:'travelconnect-f359e',
 storageBucket:'travelconnect-f359e.firebasestorage.app',
 messagingSenderId:'276817834548',
 appId:'1:276817834548:web:bd903dfab8ea6562ccd061',
 measurementId:'G-P0M0GJ4W1J'
});

export function getFirebaseRuntimeConfig(env=process.env){
 if(env.TC_FIREBASE_USE_ENV==='1')return {
  projectId:(env.TC_FIREBASE_PROJECT_ID||'').trim(),
  apiKey:(env.TC_FIREBASE_API_KEY||'').trim(),
  authDomain:(env.TC_FIREBASE_AUTH_DOMAIN||'').trim(),
  appId:(env.TC_FIREBASE_APP_ID||'').trim(),
  messagingSenderId:(env.TC_FIREBASE_MESSAGING_SENDER_ID||'').trim()
 };
 return {...travelConnectFirebaseWebConfig};
}
