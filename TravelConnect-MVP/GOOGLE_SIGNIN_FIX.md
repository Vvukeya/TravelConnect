# TravelConnect — make Google sign-in work

The Google button is implemented using Firebase Authentication and TravelConnect's server-side ID-token verification. **A live login will fail until your own Firebase web configuration is correct.** This guide does not require sharing your API key or password.

## 1. Fix the mismatch shown by TravelConnect

Your earlier login screen reported: **"The API key belongs to a different Firebase project than TC_FIREBASE_PROJECT_ID."**

In [Firebase Console](https://console.firebase.google.com/), open the **single** Firebase project you want TravelConnect to use, then **Project settings → General → Your apps → Web app → SDK setup and configuration**. Copy all five values from the **same web app** into `TravelConnect-MVP/.env`:

```dotenv
TC_FIREBASE_PROJECT_ID=projectId
TC_FIREBASE_API_KEY=apiKey
TC_FIREBASE_AUTH_DOMAIN=authDomain
TC_FIREBASE_APP_ID=appId
TC_FIREBASE_MESSAGING_SENDER_ID=messagingSenderId
```

Replace the text after `=` with the actual value for that property. Don't type the literal placeholder names. Your `authDomain` typically ends in `.firebaseapp.com`. A Web API key is a public Firebase app identifier, **not a Firebase service account secret**, but `.env` must still stay private because it can contain other keys.

**Do not change only the project ID to make an unrelated key appear valid.** Copy the entire configuration from one project.

## 2. Enable Google Authentication

In the same project:

1. Go to **Authentication → Sign-in method**. Enable **Google** and save.
2. Go to **Authentication → Settings → Authorized domains**. Add **localhost** for local development, if missing. Do not include `http://` or `:5500`.
3. When hosting, add your **real hosting domain** to Authorized domains.

Firebase projects created after April 28, 2025 may not include `localhost` by default.

## 3. Diagnose and test

Stop the server with **Control + C**. In VS Code Terminal:

```bash
cd ~/TravelConnect/TravelConnect-MVP
npm run firebase:check
npm run dev
```

The first command may print project IDs and problem descriptions; it does **not** print the API key. Fix any reported mismatch or blocked domain.

Then visit **http://localhost:5500/#auth** in a normal Chrome tab (not the installed PWA) and click **Continue with Google**.

If a Google popup appears, choose an account and finish the sign-in. TravelConnect exchanges the Firebase ID token for an HttpOnly login session on its own server. If the popup is blocked, allow popups and retry. If it still fails, inspect the browser console's Firebase error *code*; never share ID tokens or secrets.

## 4. Account safety

- New Google sign-ins create **ordinary passenger accounts**. They never become administrators automatically.
- If an email/password user already uses that Google email, first sign in using the existing password, then link Google from the **Profile** page.
- Your existing administrator account and SQLite data remain unchanged.

## Still not live

Google authentication can become live after you fix the settings above. Payments, external driver identity verification, and live GPS still require their own provider integrations and launch checks. Working unit tests do not prove those services are live.
