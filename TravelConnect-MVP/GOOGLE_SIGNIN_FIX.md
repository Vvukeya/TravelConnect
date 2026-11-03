# TravelConnect Google sign-in — Firebase project: travelconnect-f359e

## Current setup

TravelConnect already includes the **public Firebase Web app configuration** you provided, in `server/firebase-public-config.mjs`. Its values are used by both browser sign-in and server-side Firebase ID-token verification. The old `TC_FIREBASE_*` variables in your Mac's private `.env` are **ignored by default**, so an earlier wrong project key no longer takes precedence.

The bundled config uses:
- **Project ID:** `travelconnect-f359e`
- **Auth domain:** `travelconnect-f359e.firebaseapp.com`
- **Web app ID:** `1:276817834548:web:bd903dfab8ea6562ccd061`

These are Firebase's **public Web app identifiers**, not service-account private credentials. Never add a Firebase service-account private key to GitHub.

## What to configure in Firebase Console

1. In [Firebase Console](https://console.firebase.google.com/), open **travelconnect-f359e**.
2. Select **Authentication → Sign-in method**. Enable **Google**, select the required support email and **Save**.
3. Select **Authentication → Settings → Authorized domains**. For local testing, add `localhost` if it isn't present. Do not include `http://` or port `:5500`.
4. Later, authorize your **real HTTPS production domain** too.

**Google provider enablement and the authorized domain are project-side actions that this GitHub repository cannot perform.** A successful automatic syntax test does not confirm live Google OAuth.

## Update your Mac and test

Stop the currently running server with **Control+C**, then:

```bash
cd ~/TravelConnect
git pull --ff-only origin main
cd TravelConnect-MVP
npm run check
npm test
npm run firebase:check
npm run doctor
npm run dev
```

Visit `http://localhost:5500/#auth` in a **normal Chrome tab**, not an installed PWA window. Click **Continue with Google** and complete the real popup. The backend exchanges a verified Firebase token for a TravelConnect HttpOnly session.

`npm run firebase:check` prints the public project ID, domain and diagnostics, **not the API key**. If it says `localhost` is unauthorized or the Google provider is disabled, correct the Firebase Console settings above.

## If you later switch Firebase projects

By default, `server/firebase-public-config.mjs` is authoritative to prevent stale Mac `.env` values from accidentally mixing two projects. To deliberately use another project, set `TC_FIREBASE_USE_ENV=1` and supply **all five matching** `TC_FIREBASE_*` values in your private `.env` before restarting. Don't mix configuration from two Firebase projects.

## Account protection

New Google users start as **passengers**. An existing password-based account with the same email is **not automatically taken over or promoted**. Sign in with the existing password and link the matching verified Google account on the Profile screen. Your existing administrator account remains in SQLite.

The app is still under development: Google sign-in, even when active, doesn't enable payments, live GPS or automatic driver verification.
