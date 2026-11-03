/**
 * Official Firebase browser SDK. Google OAuth popup must be triggered by a real click.
 * The short-lived Firebase ID token is exchanged for our HttpOnly server session.
 * No credential, API key with privileged rights, or service-account JSON is stored here.
 */
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';

let auth;
export async function prepareGoogleAuth(config){
 const app=getApps().length?getApp():initializeApp(config);
 auth=getAuth(app);
 await setPersistence(auth,inMemoryPersistence);
}
export async function getGoogleIdToken(){
 if(!auth)throw Error('Google sign-in is still loading. Please try again.');
 const provider=new GoogleAuthProvider();
 provider.setCustomParameters({prompt:'select_account'});
 const result=await signInWithPopup(auth,provider);
 try{return await result.user.getIdToken(true)}
 finally{await signOut(auth)}
}
