<p align="center">
  <img src="TravelConnect-MVP/web/assets/icon-192.png" width="112" alt="TravelConnect South African journey app icon" />
</p>

<h1 align="center">TravelConnect</h1>
<p align="center"><strong>Every Journey Connects Us.</strong></p>
<p align="center">A South African long-distance travel marketplace, with a responsive website and installable Progressive Web App.</p>

---

## About TravelConnect

TravelConnect helps passengers discover published journeys, reserve available seats, communicate with drivers and prepare for trips. Approved drivers can publish routes and manage reservations. Administrators can review driver applications and monitor platform activity.

The interface uses sunset orange, warm gold and deep navy to match the TravelConnect app icon. **The application is still in development; it is not a certified commercial transport platform.**

### Features and status

| Feature | Current status |
| --- | --- |
| Responsive website and installable PWA | Implemented |
| Email/password accounts, secure sessions and roles | Implemented; database-backed |
| Driver applications and administrator review | Implemented; human checks required |
| Vehicle details and driver-submitted car photos | Included in the vehicle-registration update |
| Published journeys, seat reservations and cancellations | Implemented; database-backed |
| Private trip messaging | Implemented; refresh-based |
| Weather forecasts | Open-Meteo integration; commercial terms require review |
| TripAI | Supports free local Ollama; optional other providers |
| Google account sign-in | Firebase Authentication code implemented; requires your matching Firebase project configuration |
| Real card payments, live GPS, automatic identity verification and emergency dispatch | **Not connected — do not advertise as live** |

## Run locally (macOS / VS Code)

**Requirements:** Node.js 22.13 or later, Git and a modern browser.

```bash
git clone https://github.com/Vvukeya/TravelConnect.git
cd TravelConnect/TravelConnect-MVP

cp .env.example .env
npm run check
npm test
npm run dev
```

Open **http://localhost:5500**. The website and app run from the same Node.js server. The SQLite database is created under `TravelConnect-MVP/data/` and must not be committed.

The `.env` file is private. Never commit passwords, API keys, OAuth tokens or database contents.

### Administrator account

An initial administrator can be created locally with:

```bash
cd TravelConnect-MVP
export TC_ADMIN_EMAIL='admin@example.com'
read -s 'TC_ADMIN_PASSWORD?Choose a strong password: '
export TC_ADMIN_PASSWORD
npm run admin:create
unset TC_ADMIN_PASSWORD
```

Use an email address you control. Do not share the password. The admin account is saved in the local database; deploying elsewhere does not copy it.

## Google sign-in (Firebase Authentication)

1. Open [Firebase Console](https://console.firebase.google.com/), select the **same project** for all Web app configuration values.
2. Under **Authentication → Sign-in method**, enable **Google**.
3. Under **Authentication → Settings → Authorized domains**, authorize `localhost` for development and your future HTTPS domain when hosted.
4. Under **Project settings → General → Your apps**, open the Web app configuration.
5. Set the values in `TravelConnect-MVP/.env`:

```dotenv
TC_FIREBASE_PROJECT_ID=
TC_FIREBASE_API_KEY=
TC_FIREBASE_AUTH_DOMAIN=
TC_FIREBASE_APP_ID=
TC_FIREBASE_MESSAGING_SENDER_ID=
```

**Important:** Do not mix an API key from one Firebase project with the project ID from another. The app has already detected that mismatch during your setup. Copy all five values from **one registered Firebase Web app**, restart the server, and test in a normal Chrome tab.

```bash
npm run firebase:check
npm run doctor
npm run dev
```

Google login is not verified live until it succeeds with your own Firebase settings. New Google accounts begin as passengers. Existing accounts must link their matching Google identity after password sign-in; email matching by itself must not grant access.

More help: [Google sign-in troubleshooting](TravelConnect-MVP/GOOGLE_SIGNIN_FIX.md) and [Firebase setup](TravelConnect-MVP/FIREBASE_SETUP.md).

## TripAI — free local model

TravelConnect supports [Ollama](https://ollama.com/), so development on your Mac can run an AI model without paying for an OpenAI API:

```bash
ollama pull qwen3:1.7b
```

Configure `.env`:

```dotenv
TC_AI_PROVIDER=ollama
TC_OLLAMA_MODEL=qwen3:1.7b
```

Run `npm run doctor` and start the app. Ollama must be running on your Mac. When publicly hosted, the AI model must be reachable from the hosting server, or an external provider must be configured; a local model does not make cloud hosting free.

## Driver registration and vehicle photos

Drivers submit the make, model, year, colour, and a clear photo of the **actual vehicle they intend to use**. This is stored on the server, shown in administrator reviews and associated with their driver profile. Drivers must still undergo real-world checks of licence/permit, insurance and applicable transport compliance. A photograph does **not** prove roadworthiness, ownership or legal eligibility.

For privacy, do not upload people's identity documents or identifiable passengers as car photos. A driver should avoid exposing personal information (such as a registration plate) unnecessarily.

## Code structure

```text
TravelConnect-MVP/
├── web/                 # Website and installable PWA
│   ├── app.js           # Passenger, driver, admin and TripAI screens
│   ├── styles.css
│   ├── premium.css
│   └── sunset.css       # Current orange/navy visual design
├── server/              # Authenticated API, SQLite, Firebase, AI, weather
├── scripts/             # Local development, admin setup, diagnostics, backup
├── tests/               # API, security, and frontend regression tests
├── backend-overlay/     # Historical Laravel overlay; not the active runtime
└── .env.example         # Local configuration template; do not commit .env
```

**Active backend:** Node.js + SQLite. The historical Laravel overlay is not currently the live server. Hosting requires persistent storage, backups, HTTPS and thorough end-to-end security testing.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local API and website on port 5500 |
| `npm run check` | JavaScript syntax checks |
| `npm test` | Automated regression and security tests |
| `npm run firebase:check` | Safe Firebase setup diagnostics |
| `npm run doctor` | AI and service diagnostics |
| `npm run db:backup` | Back up local SQLite data |

## Hosting / production checklist

Before opening the application to the public, complete the [launch checklist](TravelConnect-MVP/LAUNCH_CHECKLIST.md), including:

- A secure HTTPS host with persistent database storage, backup and disaster recovery.
- Real payments, refunds and reconciliation with a supported provider.
- Verified driver and vehicle documents, required permissions/insurance, and transport compliance in South Africa.
- Consent-based location features, privacy controls, and a genuinely tested emergency process.
- Secure upload handling, audit logs, account recovery, rate limits and penetration testing.
- A written privacy policy, user terms, complaints process and support contact.
- Production OAuth settings for your own public domain.

## Development and tests

```bash
cd TravelConnect-MVP
npm run check
npm test
```

Automated checks do not replace a successful Google OAuth test in your browser, a full user-acceptance test, or security testing before production launch.

---

Built for South Africa. **TravelConnect — Every Journey Connects Us.**
