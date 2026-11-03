# Firebase Google sign-in — TravelConnect

TravelConnect uses **Firebase Authentication for Google Sign-In** and a separate **Node.js + SQLite backend** for user profiles, journeys, car photos, seat bookings, messaging and administrators.

## Firebase already added to the code

Your Firebase Web app configuration is bundled in [server/firebase-public-config.mjs](server/firebase-public-config.mjs), for project `travelconnect-f359e`. Its public Web app credentials are shared by the browser and backend. You do **not** need to install the npm Firebase package: the browser already uses the modular SDK through Google's official CDN.

Your existing private `.env` is preserved, and stale Firebase values in it are ignored unless you explicitly set `TC_FIREBASE_USE_ENV=1`.

## Finish setup in the Firebase Console

- Open [Firebase Console](https://console.firebase.google.com/) and select **travelconnect-f359e**.
- Go to **Authentication → Sign-in method → Google**, enable the provider, set the support email, and save.
- Go to **Authentication → Settings → Authorized domains** and allow `localhost` for local development. Add your own HTTPS hosting domain after deployment. Don't enter `http://localhost:5500` in the domain field—use just `localhost`.
- Ensure the Web app exists under **Project settings → General → Your apps**.

## Test locally

```bash
cd ~/TravelConnect/TravelConnect-MVP
npm run firebase:check
npm run doctor
npm run dev
```

Open `http://localhost:5500/#auth` in a normal Chrome tab and select **Continue with Google**. This requires a real user interaction and an enabled Google sign-in provider. The backend verifies the signed Firebase ID token and creates a TravelConnect session.

For detailed troubleshooting, see [GOOGLE_SIGNIN_FIX.md](GOOGLE_SIGNIN_FIX.md).

## Deployment overrides

For intentional use of a different Firebase project, populate your local `.env` with five values from the **same** registered Firebase Web app:

```dotenv
TC_FIREBASE_USE_ENV=1
TC_FIREBASE_PROJECT_ID=another-project-id
TC_FIREBASE_API_KEY=the-web-api-key
TC_FIREBASE_AUTH_DOMAIN=another-project-id.firebaseapp.com
TC_FIREBASE_APP_ID=the-web-app-id
TC_FIREBASE_MESSAGING_SENDER_ID=sender-id
```

Otherwise, keep `TC_FIREBASE_USE_ENV` unset, and the app uses the bundled TravelConnect project. Do not commit `.env`, Firebase Admin JSON files, or privileged credentials.

## AI is independent

TripAI remains free locally through Ollama; no paid OpenAI API is required. See [FREE_AI_SETUP.md](FREE_AI_SETUP.md).

Firebase Authentication does **not** move existing SQLite user/booking records to Firestore. Your local administrator account and database are not overwritten by adding the public Firebase config.

A real browser login is still the final verification. Syntax and unit tests cannot enable Google sign-in in Firebase Console, nor establish launch readiness.
