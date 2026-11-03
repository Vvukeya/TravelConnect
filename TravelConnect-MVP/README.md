# TravelConnect — website + installable PWA + Laravel backend starter

**Every Journey Connects Us.** A responsive South African long-distance ride-sharing prototype that runs as a desktop website and as an installable Progressive Web App (PWA) on compatible phones.

> **Important:** This repository is an MVP **demonstration**, not a production transport marketplace. All default drivers, ratings, seat counts, schedules and prices are illustrative. Bookings, messages and driver posts stay in the browser's `localStorage`; no real seats are held, no money is collected, no live GPS is tracked, and no emergency service is contacted. The optional Laravel starter provides a database-backed *sample read-only* trips API. Real booking operations must be built behind authenticated, verified backend endpoints.

## Start in VS Code in under a minute

From the extracted project folder in VS Code, if you have Node.js installed:

```bash
cd TravelConnect-MVP
npm run dev
```

Alternatively, use Python:

```bash
python3 -m http.server 5500 --directory web
```

Open **http://localhost:5500** in your browser. Edit `web/app.js`, `web/styles.css`, and `web/index.html` in VS Code; refresh to preview changes.

If you don't have Python, another local static HTTP server works too (VS Code Live Server, `npx serve web`, etc.). Opening `index.html` directly as `file://` is not recommended because the PWA service worker won't run.

## Use on your phone

Deploy the `web/` directory to a HTTPS static host (for example GitHub Pages or another service of your choice). Open the deployed link on Android/Chrome and use the browser's **Install app** action, or on iOS/Safari choose **Share → Add to Home Screen** if supported. The mobile and desktop views share the same code and responsive styling. PWA installation requires HTTPS or an eligible localhost origin; installing on a phone from a Mac's local dev server generally requires HTTPS hosting.

## Features included

- Responsive home page, hero design, route discovery, search and filters.
- Search results, driver cards, journey details and fare summary.
- Booking confirmation flow saving **sample** bookings locally.
- My trips, illustrative route tracking screen, demo trip chat.
- TripAI demo interface with deterministic, clearly labelled sample replies.
- Driver dashboard with an example journey publishing form; no online publication or verification.
- Administrative preview dashboard.
- Editable display name and profile, PWA icons, manifest and service worker.
- Route options for several South African cities.

## Connect a Laravel / MySQL starter API

For real persistence and future mobile API access, the `backend-overlay/` folder contains a small Laravel API scaffold (model, migration, seed, controller, API routes). To create the Laravel application, first install **PHP 8.2+** and **Composer** on your Mac:

```bash
bash scripts/setup-backend.sh
```

Then edit `backend/.env` with your MySQL database credentials. For local-only experimentation, Laravel's default SQLite setup is also possible; configure it in `.env` and create the database if required.

Run:

```bash
cd backend
php artisan migrate
php artisan db:seed --class=TravelConnectDemoSeeder
php artisan serve
```

API endpoints (all **sample** data):

- `GET http://127.0.0.1:8000/api/v1/health`
- `GET http://127.0.0.1:8000/api/v1/trips`
- `GET http://127.0.0.1:8000/api/v1/trips?from=Johannesburg&to=Durban&date=YYYY-MM-DD`
- `GET http://127.0.0.1:8000/api/v1/trips/1`

To read backend sample trips in the web frontend, set `window.TRAVELCONNECT_API_BASE` in `web/config.js` to `'http://127.0.0.1:8000/api/v1'`, and serve the `web/` directory from its own terminal. You may need appropriate CORS configuration to connect different localhost ports, and the phone must use a network-accessible HTTPS API instead of `127.0.0.1`.

The frontend uses seeded sample journeys if the backend is not configured or is unavailable. **Booking submissions do not use the backend yet.** Treat the API and database layer as a foundation for the next milestone, not a complete authenticated booking platform.

## Suggested GitHub workflow

Your connected GitHub username is `Vvukeya`. The repository `TravelConnect` does not yet exist; create a new **empty repository** named `TravelConnect` on GitHub first (do not initialize it with a README). Then, from this extracted project folder:

```bash
git init
git add .
git commit -m "Initial TravelConnect website and PWA MVP"
git branch -M main
git remote add origin https://github.com/Vvukeya/TravelConnect.git
git push -u origin main
```

On another computer or after it has been pushed:

```bash
git clone https://github.com/Vvukeya/TravelConnect.git
cd TravelConnect
code .
```

> Do **not** commit `backend/.env`, credentials, payment API keys, or personal verification documents. `.gitignore` excludes the Laravel `.env` file and dependencies.

## Next development milestones

1. Registration/login, verified driver workflow, policies and role-based authorization.
2. Authenticated bookings with real inventory constraints, transaction handling and cancellation rules.
3. Live trip chat, route matching, consent-based GPS sharing and verified safety flows.
4. Payment integration with hosted checkout and verified webhooks—never raw payment cards.
5. Real TripAI and weather API integration, including provenance and usage limits.
6. Production testing, POPIA privacy controls, required transport licences and accessibility review.

**Tech choices:** HTML/CSS/JavaScript PWA (no frontend build step), optional Laravel PHP REST API and MySQL, shared API for future dedicated Android/iOS clients.
