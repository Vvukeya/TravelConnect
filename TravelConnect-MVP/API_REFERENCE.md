# TravelConnect V3 — REST API reference

All endpoints run **on the same Node.js server** under `/api/v1`. HTTP JSON; the frontend uses `credentials:'same-origin'` and secure session cookies. This is an early-access API, not a public SLA-backed service.

| Method | Path | Who can access | Purpose |
|---|---|---|---|
| GET | `/health` | Anyone | Health / DB connection |
| POST | `/auth/register` | Anyone | Register user |
| POST | `/auth/login` | Anyone | Login and set HttpOnly session cookie |
| POST | `/auth/logout` | Authenticated | Invalidate session |
| GET, PATCH | `/auth/me` | GET public, PATCH logged in | Current user / update basic profile |
| GET | `/trips?from=...&to=...&date=...&seats=...` | Anyone | Search published journeys; active seats only |
| GET | `/trips/:id` | Anyone | Journey detail |
| POST | `/bookings` | Passenger | Reserve requested seats atomically; supply `requestId` |
| GET | `/bookings` | Logged-in passenger | Own bookings |
| POST | `/bookings/:id/cancel` | Booking owner | Cancel and release seats |
| POST | `/driver/apply` | Logged-in passenger | Request manual driver review |
| GET, POST | `/driver/trips` | Approved driver | List/publish own journeys |
| DELETE | `/driver/trips/:id` | Trip driver | Cancel only trips with zero active reservations |
| GET | `/driver/bookings` | Approved driver | Passenger booking summaries |
| GET, POST | `/trips/:id/messages` | Trip driver or booked passenger | Private trip messages |
| GET | `/admin/stats` | Admin | Basic counts |
| GET | `/admin/overview` | Admin | Actual database counts, recent bookings, journeys, audit event types |
| GET | `/admin/drivers?status=pending` | Admin | Driver review queue |
| POST | `/admin/drivers/:id/approve` | Admin | Internal manual approval (NOT external identity verification) |
| POST | `/admin/drivers/:id/reject` | Admin | Internal rejection |
| GET | `/weather?city=Durban&date=2026-11-04` | Anyone | Open-Meteo live model forecast; city/date whitelist and 15-minute cache |
| GET | `/ai/status` | Anyone | Whether AI integration is configured (never returns key) |
| POST | `/ai/ask` | Logged-in user | Local Ollama, Gemini free tier or opt-in OpenAI via server configuration |

All POST/PATCH/DELETE requests require `Content-Type: application/json` (except DELETE) and `X-TravelConnect-Client: web` plus same-origin checks. These protections help limit CSRF but do not replace a full production security audit.

## APIs connected vs not connected

- **SQLite backend:** connected and automated integration tests passing. User records live on the **server**, not inside the browser.
- **Open-Meteo forecast API:** adapter implemented; local/non-commercial development uses free API; commercial hosting requires `TC_OPEN_METEO_KEY` and a paid provider plan. A real network connection is required.
- **OpenAI Responses API:** backend adapter implemented and unit-tested. Disabled without `TC_OPENAI_API_KEY`. Production use requires a paid API account, appropriate provider privacy terms and cost controls. Users must sign in. The API never sees TravelConnect passwords or session cookies.
- **Google Maps directions:** browser link only; not a live vehicle location or directions API key integration.
- **Payments, ID verification, GPS tracking, SOS, notifications, email verification:** NOT CONNECTED. No real money or emergency response is processed.

## Ops commands

```
npm run check
npm test
npm run db:backup
npm run dev
```

## Host safety requirements

Deploy on a Node.js 22.13+ platform with **persistent writable SQLite data volume**, HTTPS reverse proxy, strict secret management and daily offsite backup/restore drills. Never put `.env` files or `data/` into Git. Set `NODE_ENV=production` for commercial hosting; the weather route then requires the commercial provider credential. The test server is not suitable for public ride-sharing operations before the launch checklist is completed.


## V4 Firebase Authentication and TripAI

- `GET /api/v1/auth/firebase/config`: `{ enabled: boolean, config: publicFirebaseWebConfig | null }`. The returned web configuration contains Firebase browser identifiers only; never service-account credentials.
- `POST /api/v1/auth/google`: accepts `{ "idToken":"<Firebase ID token from Google OAuth>" }`. This endpoint requires the normal `X-TravelConnect-Client: web` same-origin JSON protection. It verifies Google's RS256 signature and Firebase project/issuer, verified email and provider, then either creates a passenger or signs in a linked account. Existing password users must explicitly link from a logged-in session.
- `GET /api/v1/ai/status`: returns provider/model and `enabled:true` only when the selected provider is ready; Ollama checks that the local model is installed.
- `POST /api/v1/ai/ask`: authenticated, throttled request containing `{ "question":"..." }`. Returns real model text from free local Ollama or configured Gemini. If Ollama is offline, returns a safe actionable 503 error instead of fake AI text.

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md). The API is not a Firebase Firestore database: authenticated travel data remains in SQLite.
