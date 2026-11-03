# TravelConnect V4 — Firebase Google sign-in + live TripAI configuration

> **Important:** Code is implemented, but Google OAuth and live TripAI cannot work until **you** create the Firebase project and provide your own configuration/secret API key. Do not paste credentials into ChatGPT, commit `.env`, or upload a service-account JSON file. TravelConnect's business data currently uses persistent **SQLite**, not Cloud Firestore. The Firebase integration in V4 is **Firebase Authentication**.

## 1. Firebase Console — create your project

1. Visit **https://console.firebase.google.com/** and create a Firebase project called `TravelConnect` (or choose another name).
2. Open **Authentication → Sign-in method**. Enable **Google**, select a support email, and save.
3. Go to **Project settings → Your apps**, select the Web icon `</>` and register an app named `TravelConnect Web`.
4. Copy the Firebase **Web app configuration** (`apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`). These web identifiers are not your service-account private key. Restrict API keys appropriately in Google Cloud.
5. In **Authentication → Settings → Authorized domains**, add `localhost` for development if absent, and later add the real HTTPS domain from your hosting provider. New Firebase projects may not have `localhost` pre-authorized.
6. For Google OAuth, use a real browser origin such as **http://localhost:5500** for local testing. Do not attempt OAuth from a `file://` page or an arbitrary address.

## 2. Configure the local server

Open your VS Code terminal:

```bash
cd ~/TravelConnect/TravelConnect-MVP
cp .env.example .env
```

Open `.env` inside VS Code and fill the Firebase values copied from the **Web app configuration**:

```dotenv
TC_FIREBASE_PROJECT_ID=your-project-id
TC_FIREBASE_API_KEY=your-web-api-key
TC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
TC_FIREBASE_APP_ID=1:123456:web:abcdef
TC_FIREBASE_MESSAGING_SENDER_ID=123456
```

Never create a fake `FIREBASE_ADMIN_PRIVATE_KEY` or put service-account credentials in the browser. V4 verifies Firebase ID tokens against Google's rotating public certificates server-side; it does **not** require a service-account private key for identity verification. Account roles (including administrator rights) are assigned only in the TravelConnect database.

Restart the development server:

```bash
npm run dev
```

Visit **http://localhost:5500/#auth**. Once configured, **Continue with Google** becomes available. Select a Google account in the official Firebase popup. The server verifies the Google identity and creates an HttpOnly TravelConnect login session.

### Existing email/password users and administrator safety

- **Google signup:** A Google address never before used on TravelConnect receives a new *passenger* account. Google login does not grant driver/admin privileges.
- **Existing password account with the same email:** Sign in with the *existing password*, then use **Profile → Link your Google account**, selecting a Google identity with the **same verified email**. Do not try to log in using Google before linking, because a conflict error is intentional security protection.
- **Existing administrator:** Your current admin account is retained. If its email is not an actual Google account you control, keep using its existing password. You must not link a Google account with a different email to your admin account. Do not share admin credentials.
- **Google-only account:** Has no usable local password; the API stores a random unused password record to remain compatible with existing schema. Use Google to log in.
- **Google OAuth error:** Ensure the provider is enabled, `localhost`/your hosted domain is authorized, and the browser permits the sign-in popup. Firebase public SDK modules are loaded over HTTPS from Google's CDN.

## 3. Activate real TripAI (OpenAI API)

1. Sign in to **https://platform.openai.com/api-keys** with an OpenAI API account and set up API billing/permissions as required.
2. Create an API key and add it **only** to the local `.env` file:

```dotenv
TC_OPENAI_API_KEY=your-private-openai-api-key
TC_AI_MODEL=gpt-5.4-mini
```

3. Restart the Node server with `npm run dev`.
4. In TravelConnect, **sign in** and open **TripAI**. It should display **Live AI planning assistant · provider connected**. Its answers then come from the OpenAI Responses API rather than the old rules-based simulation. Your API usage incurs charges. Availability depends on your account and enabled model access. If the provider is unconfigured, unavailable, or rejects requests, the interface displays a clear status rather than pretending an AI request succeeded.
5. The server holds the key; the browser sends questions to `/api/v1/ai/ask` and never sees your secret.

**Note:** A ChatGPT subscription is separate from API billing/credentials. TripAI is a travel-information assistant. It does not automatically conduct payments, see private trip details, or offer live GPS data. Verify safety-critical information independently.

## 4. Check that everything is functioning

```bash
cd ~/TravelConnect/TravelConnect-MVP
npm run check
npm test
npm run db:backup
npm run dev
```

Open these endpoints for status:

- `http://localhost:5500/api/v1/health` — real backend and database health
- `http://localhost:5500/api/v1/auth/firebase/config` — Google sign-in status and *public* Firebase web config only
- `http://localhost:5500/api/v1/ai/status` — whether TripAI has been configured

Test in at least two real browsers/devices: register with Google, log out, log back in, book a published trip, cancel it, check another user's view. Test a password account and admin account separately. Test HTTPS and your real domain before public launch.

## 5. Where Firebase stops and SQLite starts

V4 **does not** automatically migrate trip bookings or messages to Cloud Firestore. They remain in `data/travelconnect.sqlite` so that seat allocations stay transactional and your existing admin account is preserved. On a production host, that database file needs persistent storage and backups. If you want to run the entire database in Firebase, it is a separate database migration (schema, Firestore Security Rules, seat-booking transactions, admin auditing, deployment, costs) rather than a single Firebase configuration switch.

For public passenger use, the remaining must-have work includes real payment gateway integration, document/driver checks, transport legal compliance, consent-based GPS/trusted-contact sharing, incident escalation, security audit and supported hosting with backups. Passing the automated tests does not establish that a commercial platform is 100% production-ready.
