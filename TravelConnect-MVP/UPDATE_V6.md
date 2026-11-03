# TravelConnect V6 — sunrise/sunset theme and Firebase configuration diagnostics

This update combines V4–V5 features missing from the GitHub main branch with the **free Ollama TripAI**, icon artwork you supplied, sunset palette, Google sign-in setup check and regression tests.

## Update Mac VS Code safely

Your local V5 files may be newer than the previous GitHub main branch, so use this once:

```bash
cd ~/TravelConnect
git stash push -u -m "Local backup before V6" -- TravelConnect-MVP
git pull --ff-only origin main
cd TravelConnect-MVP
npm run check
npm test
npm run firebase:check
npm run doctor
npm run dev
```

The stash stores your old **uncommitted code files** as a fallback. Do not run `git stash pop` unless you intentionally want to restore or compare your pre-update code. The ignored `.env` and `data/` SQLite database are untouched. To list saved stashes use `git stash list`.

If `git pull` fails, **do not run reset --hard**: save the output and investigate local changes first.

## Diagnose Google sign-in

Run `npm run firebase:check`, then open `http://localhost:5500/#auth` in an ordinary browser tab and click **Check Google sign-in configuration**. The report deliberately does not expose your API key. The public Firebase configuration endpoint can check basic validity and allowed domains, but **cannot certify that the Google provider is enabled**; that must be set in the Firebase Console.

Firebase Console: Authentication → Sign-in method → Google → Enable and save; Authentication → Settings → Authorized domains → include `localhost`. Under Project settings → Your apps select the **Web app** and copy `apiKey`, `authDomain`, `projectId`, `appId`, and `messagingSenderId` into the existing local `.env` file. Ensure all fields belong to one Firebase project. Then restart `npm run dev`.

Local `.env` must not be committed. OAuth popups can behave differently in installed app windows, so sign in first in a regular Chrome tab using `http://localhost:5500/#auth`. Add your production hostname as an authorized domain only after HTTPS hosting is ready.

Firebase public authentication is **not** the SQL database. Existing bookings, admin accounts, TripAI and your SQLite database are unchanged by this update. Driver identity verification, legal approvals, payments and real GPS remain to be implemented before accepting paying passengers.
