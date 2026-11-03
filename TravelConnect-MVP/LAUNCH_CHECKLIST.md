# TravelConnect production launch checklist

**Status as of 3 November 2026:** Technical foundation built and API tests passing. **Not yet ready for public real-world bookings or payment collection.** This checklist reflects the original TravelConnect vision but distinguishes implemented from outstanding work.

## Implemented and automatically tested (v0.2)

- [x] Responsive website and installable PWA shell.
- [x] User account registration and login with password hashing and HttpOnly session cookies.
- [x] Role protection: passenger, driver, administrator.
- [x] Driver application and manual admin approval status; **does not itself verify documents**.
- [x] Driver journey publication after admin approval.
- [x] Live *database* journey listings (not seeded availability), route/date/seat searches and fare display.
- [x] Authenticated seat reservations with atomic inventory decrement, idempotency keys and capacity checks.
- [x] Booking history and cancellation with seat restoration.
- [x] Server-stored messages restricted to booked travellers and the relevant driver (manual refresh).
- [x] Basic administrator statistics and manual application review dashboard.
- [x] Automated server API tests and frontend route-render tests.

## Mandatory before a public commercial launch

- [ ] **Confirm the hosting platform and final architecture.** Current API uses Node.js + SQLite; the master plan specifies Laravel + MySQL. Choose and migrate to a supported, scalable database and secure hosting before wide public adoption.
- [ ] **Real driver verification.** Secure document collection, ID checks, driving licence and professional driving permit checks where required, vehicle records, insurance checks and an accountable review/audit procedure. "Admin approved" is not an external verification.
- [ ] **Email verification and password recovery.** Integrate a trustworthy email service, expiring single-use reset tokens, account activation and related abuse controls.
- [ ] **Production payment integration.** Choose a regulated South African PSP, use provider-hosted checkout (never collect raw card details), verify webhooks cryptographically, track settlement/refunds and ensure payment/booking state consistency.
- [ ] **Transport compliance.** Obtain South African legal guidance regarding transport/operator licensing, permit requirements, insurance, consumer terms and marketplace responsibilities.
- [ ] **POPIA compliance.** Privacy policy, lawful basis/consents, data minimisation, retention/deletion workflows, contact-data safeguards, breach-response procedures and cross-border processor agreements if applicable.
- [ ] **GPS and safety tools.** Explicit trip-scoped consent, access control, precise geolocation, time-limited trusted-contact sharing, accuracy warnings, revocation and independently tested SOS/escalation workflows. Never depict a simulated map as a live safety service.
- [ ] **Reliable notifications.** Transactional email/SMS/push for booking status, cancellations, changes and driver communications; escalation when operators cancel booked trips.
- [ ] **Real TripAI and weather.** Server-side API credentials, privacy-conscious prompting, verifiable source timestamps, rate limits, model cost controls, warnings and failure handling. The current TripAI UI is a clearly labelled deterministic demonstration.
- [ ] **Abuse & fraud controls.** Report/block users, content moderation, admin account protection (MFA), audit review, account suspension, distributed rate limiting and CAPTCHA when necessary.
- [ ] **Trip and booking lifecycle.** Refunds, cancellations by a driver with existing reservations, missed departures, seat disputes, no-shows, schedule updates, travel support and rider/driver ratings.
- [ ] **App accessibility and quality.** Keyboard/screen-reader checks, mobile device validation, multi-browser testing, low-bandwidth testing, end-to-end UI automation, data migration tests and load/concurrency tests on target infrastructure.
- [ ] **Operations.** Backups restored in a drill, HTTPS and secure domains, environment secrets, production logs without secrets, alerting, uptime monitoring, rollbacks, disaster recovery and customer support channels.
- [ ] **Store distribution (if desired).** PWA can be installed from supported browsers over HTTPS; dedicated Android APK / iOS App Store distribution are separate workstreams.

## Important distinction

A local test run with all tests passing **does not prove 100% functionality in production**, especially where integrations, regulated activities or user safety are involved. Run a supervised closed beta before a public launch. Never accept real payment or represent verification/trackers as active until independently confirmed.
