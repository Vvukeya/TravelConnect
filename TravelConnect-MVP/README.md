# TravelConnect V5 — Website, installable app, Google sign-in and FREE TripAI

**New in V5:** Your supplied South Africa road-trip image is the website favicon, app icon, Apple touch icon and header brand artwork. The sign-in page has a genuine multicolour Google logo and a secure, configurable **Firebase Authentication + Google Single Sign-On** flow. TripAI now defaults to **free local Ollama**. You can optionally use the quota-limited Gemini free API tier. OpenAI is opt-in only. The existing SQLite accounts, driver approval, seat bookings and private messages are preserved.

**To activate Google, see [FIREBASE_SETUP.md](FIREBASE_SETUP.md). To use a real free AI model, follow **[FREE_AI_SETUP.md](FREE_AI_SETUP.md)**.** Firebase credentials and API keys are NOT included or guessed. They must come from projects you own. Without Firebase configuration, Google sign-in is disabled. Real free TripAI works after starting Ollama and pulling the model, without any secret API key. Firebase Auth does not yet replace the SQLite booking database with Firestore.

## Upgrade existing Mac installation (preserves your database)

1. Stop the old website with **Ctrl+C**.
2. Download V4 ZIP to your Downloads folder. From the VS Code terminal:

```bash
cd ~/TravelConnect
unzip -o ~/Downloads/TravelConnect-Platform-V4.zip -d .
cd TravelConnect-MVP
npm run check
npm test
npm run db:backup
npm run dev
```

3. Open `http://localhost:5500/#auth`. Keep your existing admin password: you do **not** need to create another admin account.
4. If the old icon remains because your PWA cached an older build, refresh twice, close and reopen the installed app, or uninstall the old PWA and reinstall after the service worker updates.
5. When it looks right, upload source code to GitHub:

```bash
cd ~/TravelConnect
git status
git add TravelConnect-MVP
git commit -m "Add Firebase Google sign-in, TripAI config and new TravelConnect icon"
git push origin main
```

`.env` and `data/` are excluded from GitHub. Do not publish a Firebase service-account private key or OpenAI secret anywhere.

---

# TravelConnect — Website, PWA, SQLite database and weather API (v0.3)

**Every Journey Connects Us.** This is a **working, locally testable multi-user foundation** for a South African journey-sharing platform. It is **NOT ready to accept paying passengers or support real-world safety operations** yet. Read [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before hosting for public use.

## What really works in v0.3

- Users can **register, sign in, sign out and edit their profiles**. Passwords are salted and hashed with `scrypt`. Login uses opaque, server-side sessions in HttpOnly cookies.
- Passengers can see **real journeys published to the shared database**, book available seats, view bookings from other devices and cancel upcoming reservations.
- Seat inventory updates in an **atomic SQLite transaction**. Overbooking requests return an error; repeated booking requests with the same request ID do not take additional seats.
- Users can apply to become drivers. A manually bootstrapped administrator can review applications and approve/reject them. Only approved drivers can publish public journeys.
- Approved drivers can publish and view trips, see passenger reservations, message their booked passengers, and cancel trips *without* active reservations.
- Members of a booked journey can exchange **server-stored private trip messages**. Press **Refresh messages** to fetch new ones; this is not WebSocket live chat.
- The PWA and responsive website use the same backend over same-origin `/api/v1` REST endpoints. Accounts, trips and bookings persist in the SQLite database file instead of a browser's localStorage.
- Automated tests cover authentication, roles, publication, inventory, cancellation, idempotency, message permissions, security headers and frontend route rendering.

**Not included:** real payment processing, live GPS, professional document verification, always-on hosted AI, production-ready Google sign-in, email/phone verification, password recovery, emergency dispatch, push notifications, trusted-contact sharing and legal compliance certification. Those require real providers, credentials, user consent, and production validation. No money is collected; reservation fares are displayed only.

## What is new in v0.3

- Completely redesigned **administrator workspace** with desktop sidebar, mobile layout, real database metrics, pending driver reviews, recent bookings, journey inventory and audit event summaries.
- New **Weather** tab and journey forecast cards calling the server-side `/api/v1/weather` endpoint. This checks real Open-Meteo forecasts; no dummy temperatures are returned.
- **TripAI free local model** via Ollama, optional quota-limited Gemini free tier and optional paid OpenAI fallback. Auth, rate limiting, and safe provider errors are retained. No paid OpenAI key is needed for local AI.
- Forecasts show daily high, low, precipitation probability, conditions and data attribution. Fixed city coordinates are used; no personal GPS data is collected.
- Cache is shared across users for 15 minutes to reduce provider requests. Requests time out cleanly if the provider is offline. Weather is informational only—not a road hazard alert.
- Google Maps *directions link* from journey details and booking journey screen. This opens map directions in a new tab; it is **not** a connected vehicle tracker.
- Database backups using `npm run db:backup` to make a consistent snapshot into the ignored `data/backups/` directory.
- Expanded automated tests, refreshed visual styles, mobile responsive administration and improved early-access messaging.

### Commercial weather API licensing

Open-Meteo’s free public API is for **non-commercial evaluation only**. Locally, weather checks use this API for development. When you set `NODE_ENV=production`, the weather endpoint **requires** `TC_OPEN_METEO_KEY`, the paid/commercial Open-Meteo credential, and uses `customer-api.open-meteo.com`. Obtain a commercial plan first: https://open-meteo.com/en/pricing. Do not deploy the free public endpoint commercially. Preserve the displayed provider attribution.

### FREE real TripAI (no OpenAI payment)

**Recommended for your Mac:** Install [Ollama](https://ollama.com/download/mac), open the app, then run `ollama pull qwen3:1.7b`.
Keep your existing Firebase settings in `.env` and add `TC_AI_PROVIDER=ollama` and `TC_OLLAMA_MODEL=qwen3:1.7b`. Then run `npm run doctor && npm run dev`.

No OpenAI API key, OpenAI credits, or per-message API fees are needed. **For limited hosted use**, you may instead select `TC_AI_PROVIDER=gemini` with a Gemini free-tier key. Read **[FREE_AI_SETUP.md](FREE_AI_SETUP.md)** for both options and realistic deployment limitations.

## 1. Run it in VS Code on your Mac

Your files are located in `~/TravelConnect/TravelConnect-MVP` when you have copied this update into your existing Git clone.

1. Stop the old server with **Control + C** in its terminal.
2. Open a terminal inside VS Code and run:

```bash
cd ~/TravelConnect/TravelConnect-MVP
node -v
npm run check
npm test
npm run db:backup    # optional, before making major changes
npm run dev
```

3. Open **http://localhost:5500** in Chrome.

The frontend and API now start together on port **5500**. Node.js **22.13+** is required. Your current Node 26 installation is suitable. There are **no npm dependencies to install** for this MVP. On Node 22, `node:sqlite` may print an experimental feature warning, although the tests run successfully.

If a previous PWA version appears, refresh the page twice or use Chrome **Cmd + Shift + R** so the updated service worker can activate.

## 2. Set up your own administrator account

In a **second Terminal** window, stop the web server or keep it running; either is fine. Choose an email and a *unique* strong password. On your Mac using zsh:

```bash
cd ~/TravelConnect/TravelConnect-MVP
export TC_ADMIN_EMAIL='you@example.com'
read -s 'TC_ADMIN_PASSWORD?Set a strong admin password: '
export TC_ADMIN_PASSWORD
npm run admin:create
unset TC_ADMIN_PASSWORD
```

**Replace** `you@example.com` with your administrator email. The password is entered invisibly. An administrator can only be created using this local/secure server command, not through public registration. Create it **once** on the actual deployed database as well. Never commit passwords or administrative data to GitHub.

Admin permissions are separate from passenger and driver accounts. If a registered account already uses the admin email, the script will refuse to upgrade it silently; use a new dedicated admin email.

## 3. Test the multi-user flow

Open a normal and an incognito browser window to simulate separate people:

1. **Driver browser:** create a regular account, open **Drive**, and apply using a vehicle description.
2. **Admin browser:** sign in with the administrator account, open **Profile → Admin console**, inspect the application and approve only after independently reviewing required documents and compliance.
3. **Driver browser:** open Drive and press **Check approval status**, then publish a journey for tomorrow (for example Johannesburg to Durban, 3 seats).
4. **Passenger browser:** register a different account, search the same date and route, choose a driver and reserve 1–2 seats. Open **My trips**.
5. **Driver browser:** open the dashboard. The booking appears under passenger reservations; open **Message**.
6. **Passenger browser:** open the journey and its messages; send a message. Use **Refresh messages** on the other browser to retrieve it.
7. **Passenger browser:** cancel the reservation. Search again and verify that the available-seat count increased.

Public journeys **start empty**. This is intentional: the app will not invent live drivers, trips, ratings or availability. The original screenshot/demo data has been removed from the online reservation list.

## 4. Weather and database APIs

Core REST APIs include `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/trips`, `/api/v1/bookings`, `/api/v1/driver/trips`, `/api/v1/admin/overview`, `/api/v1/admin/drivers`, `/api/v1/ai/status`, `/api/v1/ai/ask`, and `/api/v1/trips/:id/messages`. These work with persisted database records.

Example weather request after starting the server:

```bash
curl 'http://127.0.0.1:5500/api/v1/weather?city=Durban'
```

This fetches a **real model forecast** using Open-Meteo, or returns an explicit error if weather is unavailable. A live internet connection is required; forecasts are limited to dates returned by the provider. On a commercial hosted deployment, set `TC_OPEN_METEO_KEY` through a secure host environment variable, never in `web/config.js` or GitHub.

### Back up the database

```bash
npm run db:backup
```

The backup remains **on your Mac**, not GitHub. Copy it securely to offsite storage and practise restores before hosting real customer accounts. Database backups may contain sensitive user data; do not share them publicly.

## 5. Where data lives

SQLite file (default):

```text
TravelConnect-MVP/data/travelconnect.sqlite
```

This path is excluded from GitHub through `.gitignore`. Do not delete it if you want to keep accounts and reservations. On a hosted server the database directory **must be on persistent storage**. A temporary/free ephemeral filesystem may erase user data after redeployments or restarts.

The app uses SQLite transactions and WAL mode. It is appropriate for a single-server initial pilot, not a high-scale multi-replica production setup. The project master specification targets **Laravel/PHP + MySQL**. That migration is **not implemented** in v0.2; the older `backend-overlay/` remains as reference-only starter files and does not serve the current frontend.

## 6. Hosting later — not public launch-ready

This build must run on a host that supports **Node.js 22.13 or newer**, persistent writable storage, HTTPS and environment variables. Do **not** use a static-only hosting service for this database-backed version. It will not work if you only upload `web/` to GitHub Pages.

For a single-instance trial behind a correctly configured HTTPS reverse proxy:

```bash
HOST=0.0.0.0 PORT=8080 TC_DATA_DIR=/path/to/persistent/disk node scripts/dev.mjs
```

Configure the proxy to preserve `Host` and terminate TLS; only set `TRUST_PROXY=1` if the proxy is under your control and sanitises `X-Forwarded-Proto`. Secure cookies are set on HTTPS connections. Set up **daily database backups**, monitoring and a recovery plan before accepting users. Do not publicly expose this test server or use genuine passenger data until launch requirements are met.

## 7. GitHub workflow

Your existing repository is [Vvukeya/TravelConnect](https://github.com/Vvukeya/TravelConnect) and it already has a `TravelConnect-MVP` folder. **Do not run `git init` again.** Extract the updated ZIP *at the repository root*, replacing `TravelConnect-MVP` files. Then:

```bash
cd ~/TravelConnect
cd TravelConnect-MVP
npm run check && npm test
cd ..
git status
git add TravelConnect-MVP
git commit -m "Add TravelConnect authenticated booking platform"
git push origin main
```

Your actual database, passwords, credentials and `.env` files will remain ignored by Git. Check the `git status` output before pushing.

## 8. Security notes

The server includes password hashing, account roles, server sessions, SQL parameter binding, transactional inventory, API input limits, same-origin write checks and basic per-IP throttling. This is a foundation, **not a substitute for an independent penetration test or deployment security review**. See the launch checklist for password recovery, email verification, moderation, rate limits across multiple servers, audit logging, provider integration and privacy requirements.

See [API_REFERENCE.md](API_REFERENCE.md) for specific REST endpoints and test status.

## Design reference

Editable Figma file: [TravelConnect Prototype](https://www.figma.com/design/dZQ1VTCp5BbpFlWMKmnky0). The source code runs independently of Figma.


## Diagnostics: Troubleshoot Google sign-in and TripAI

Run `npm run doctor` from `TravelConnect-MVP`; it prints whether each configuration field is present **without revealing secret values**. This does not verify billing or external OAuth settings.

If Google displays `auth/internal-error`, test in a **normal Chrome tab** (not the installed PWA) at `http://localhost:5500/#auth`. In Firebase Console, enable Authentication → Sign-in method → Google, set a support email, and add `localhost` under Authentication → Settings → Authorized domains. Recheck that `.env` matches **Project settings → Your apps → Web app configuration**, then restart `npm run dev`. Inspect Chrome DevTools Console/Network only if the issue persists. Never paste ID tokens or API keys in tickets.

If TripAI fails, the UI now indicates whether the provider rejected its credentials (401), API quota/rate limits (429), model/permissions (400/403), or has a temporary outage (503). For **free Ollama**, confirm Ollama.app is running and the model shown by `ollama list` matches your `.env`. For **Gemini free-tier**, check the provider quota and key. The optional paid OpenAI provider is not used unless explicitly selected. The server logs **only the provider HTTP status and error code**, not secrets.

These improvements provide diagnostics, **not a promise of working third-party services until provider settings, accounts and billing are configured**.
