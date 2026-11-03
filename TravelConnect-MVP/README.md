# TravelConnect — database-backed website and installable PWA (v0.2)

**Every Journey Connects Us.** This is a **working, locally testable multi-user foundation** for a South African journey-sharing platform. It is **NOT ready to accept paying passengers or support real-world safety operations** yet. Read [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before hosting for public use.

## What really works in v0.2

- Users can **register, sign in, sign out and edit their profiles**. Passwords are salted and hashed with `scrypt`. Login uses opaque, server-side sessions in HttpOnly cookies.
- Passengers can see **real journeys published to the shared database**, book available seats, view bookings from other devices and cancel upcoming reservations.
- Seat inventory updates in an **atomic SQLite transaction**. Overbooking requests return an error; repeated booking requests with the same request ID do not take additional seats.
- Users can apply to become drivers. A manually bootstrapped administrator can review applications and approve/reject them. Only approved drivers can publish public journeys.
- Approved drivers can publish and view trips, see passenger reservations, message their booked passengers, and cancel trips *without* active reservations.
- Members of a booked journey can exchange **server-stored private trip messages**. Press **Refresh messages** to fetch new ones; this is not WebSocket live chat.
- The PWA and responsive website use the same backend over same-origin `/api/v1` REST endpoints. Accounts, trips and bookings persist in the SQLite database file instead of a browser's localStorage.
- Automated tests cover authentication, roles, publication, inventory, cancellation, idempotency, message permissions, security headers and frontend route rendering.

**Not included:** real payment processing, live GPS, professional document verification, weather feeds, third-party TripAI, Google sign-in, email/phone verification, password recovery, emergency dispatch, push notifications, trusted-contact sharing and legal compliance certification. Those require real providers, credentials, user consent, and production validation. No money is collected; reservation fares are displayed only.

## 1. Run it in VS Code on your Mac

Your files are located in `~/TravelConnect/TravelConnect-MVP` when you have copied this update into your existing Git clone.

1. Stop the old server with **Control + C** in its terminal.
2. Open a terminal inside VS Code and run:

```bash
cd ~/TravelConnect/TravelConnect-MVP
node -v
npm run check
npm test
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

## 4. Where data lives

SQLite file (default):

```text
TravelConnect-MVP/data/travelconnect.sqlite
```

This path is excluded from GitHub through `.gitignore`. Do not delete it if you want to keep accounts and reservations. On a hosted server the database directory **must be on persistent storage**. A temporary/free ephemeral filesystem may erase user data after redeployments or restarts.

The app uses SQLite transactions and WAL mode. It is appropriate for a single-server initial pilot, not a high-scale multi-replica production setup. The project master specification targets **Laravel/PHP + MySQL**. That migration is **not implemented** in v0.2; the older `backend-overlay/` remains as reference-only starter files and does not serve the current frontend.

## 5. Hosting later — not public launch-ready

This build must run on a host that supports **Node.js 22.13 or newer**, persistent writable storage, HTTPS and environment variables. Do **not** use a static-only hosting service for this database-backed version. It will not work if you only upload `web/` to GitHub Pages.

For a single-instance trial behind a correctly configured HTTPS reverse proxy:

```bash
HOST=0.0.0.0 PORT=8080 TC_DATA_DIR=/path/to/persistent/disk node scripts/dev.mjs
```

Configure the proxy to preserve `Host` and terminate TLS; only set `TRUST_PROXY=1` if the proxy is under your control and sanitises `X-Forwarded-Proto`. Secure cookies are set on HTTPS connections. Set up **daily database backups**, monitoring and a recovery plan before accepting users. Do not publicly expose this test server or use genuine passenger data until launch requirements are met.

## 6. GitHub workflow

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

## 7. Security notes

The server includes password hashing, account roles, server sessions, SQL parameter binding, transactional inventory, API input limits, same-origin write checks and basic per-IP throttling. This is a foundation, **not a substitute for an independent penetration test or deployment security review**. See the launch checklist for password recovery, email verification, moderation, rate limits across multiple servers, audit logging, provider integration and privacy requirements.

## Design reference

Editable Figma file: [TravelConnect Prototype](https://www.figma.com/design/dZQ1VTCp5BbpFlWMKmnky0). The source code runs independently of Figma.
