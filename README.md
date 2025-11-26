# Denuo Web, LLC site

A Firebase + Google Cloud Run powered site for Denuo Web, LLC. The frontend is a Vite/React app with a Firebase-authenticated admin dashboard that edits Firestore-driven content. The backend is a minimal Express API deployed to Cloud Run for contact capture and admin utilities. CI/CD is wired through GitHub Actions.

## Prerequisites
- Node.js 20 (use `nvm use 20` or install via nvm) + npm
- Firebase CLI: `npm install -g firebase-tools`
- Terraform >= 1.6 (if using `infra/terraform`)
- Google Cloud SDK (`gcloud`) if you plan to deploy/run Cloud Run manually or authenticate Terraform via ADC
- GitHub access to set repo secrets for CI/CD

## Project layout
- `web/` – React + Vite SPA with Firebase Auth + Firestore-driven content and admin dashboard
- `api/` – Express API for Cloud Run (`/health`, `/contact`, `/admin/status`)
- `firebase.json` / `.firebaserc` – Hosting + Cloud Run rewrite config
- `firestore.rules` – Secures site content + contact submissions
- `.github/workflows/` – Deploy pipelines for Hosting and Cloud Run
- `docs/SPEC.md` – Specification and feature outline for the site
- `.env.example` – Sample values for CI/CD secrets (set in GitHub, not committed)
- `web/src/i18n/` – Localization strings (EN/JA) used by the UI toggles
- `infra/terraform/` – Scaffold to enable APIs, create deploy service account, Artifact Registry, and push GitHub secrets

## Frontend (Firebase Hosting)
1. Copy `web/.env.example` to `web/.env` and fill your Firebase web app values.
2. Install deps and run locally:
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. Build for release: `npm run build` (outputs to `web/dist`).

The admin dashboard writes to Firestore `siteContent/public`. Update security rules (`firestore.rules`) before going live.

### Firebase Emulator Suite (local)
- Toggle `VITE_USE_FIREBASE_EMULATORS=true` in `web/.env` to point the SPA to local emulators.
- Start emulators (requires `firebase-tools`):\
  `firebase emulators:start --only auth,firestore --project $FIREBASE_PROJECT_ID`
- Auth emulator runs on :9099 and Firestore emulator on :8080 (matching `firebase.json`). Hosting emulator is configured on :5000 if you prefer serving the built app via `firebase emulators:start --only hosting,auth,firestore`.
- Radix UI Themes handles the light/dark toggle; appearance choice persists locally.
- Language toggle (EN/JA) is driven by `src/i18n/uiCopy.ts`; UI labels fall back to English when translations are missing.

## Backend (Cloud Run API)
1. Install deps: `cd api && npm install`.
2. Local run (requires application default or `FIREBASE_SERVICE_ACCOUNT` env): `npm run dev`.
3. Optional Stripe invoicing: set `STRIPE_SECRET_KEY` to enable `/billing/invoice` (admin-only).
3. Deploy to Cloud Run (example):
   ```bash
   gcloud builds submit api --tag gcr.io/$PROJECT_ID/denuo-api
   gcloud run deploy denuo-api \
     --image gcr.io/$PROJECT_ID/denuo-api \
     --region us-central1 \
     --allow-unauthenticated
   ```

Endpoints:
- `GET /health` – service health
- `POST /contact` – `{ name, email, project?, message }`; stores to Firestore `contactRequests` when credentials are present
- `GET /admin/status` – requires Firebase ID token with `admin: true` custom claim
- `POST /billing/invoice` – admin-only; creates and emails a Stripe invoice (`{ email, name, amountCents, description? }`)

## Firestore rules
Deploy rules to lock down writes to admin-only users and allow public reads for marketing content:
```bash
firebase deploy --only firestore:rules
```

## Set an admin claim
Use a service account with Firebase Auth admin permissions:
```bash
export FIREBASE_SERVICE_ACCOUNT="$(cat path/to/serviceAccount.json)"
node api/scripts/setAdminClaim.js --email=you@example.com
```

## GitHub Actions / secrets
Set these repo secrets before enabling CI/CD (Terraform will populate them by default using the generated deployer key for both Hosting and Cloud Run):
- `FIREBASE_SERVICE_ACCOUNT` – JSON for a Firebase Hosting deploy service account
- `FIREBASE_PROJECT_ID` – Firebase project id
- `GCP_SERVICE_ACCOUNT_KEY` – JSON key with Cloud Run + Artifact Registry permissions
- `GCP_PROJECT_ID` – Google Cloud project id
- `GCP_REGION` – Cloud Run region (e.g., `us-central1`)
- `STRIPE_SECRET_KEY` – Stripe secret (for invoicing API)
- A sample `.env.example` at repo root lists these keys (for local reference only; do not commit secrets).
- Set GitHub Actions repository variables (or secrets) for the Vite web config so production builds enable auth: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_USE_FIREBASE_EMULATORS` (usually `false`).

`deploy-hosting.yml` builds `web` and deploys Hosting. `deploy-cloudrun.yml` builds and deploys `api` to Cloud Run when `api/**` changes.

## Content model
- Live content stored at Firestore `siteContent/public`; fallback content in `web/src/content/fallback.ts` is built from Jaron Rosenau's resume and recent work (QuestByCycle, Moonshine Art, CrowdPM).
- Services, projects, differentiators, process, and contact info are editable via `/admin` after signing in.
- Admin can send Stripe invoices from `/admin` when the API has `STRIPE_SECRET_KEY` set; the UI uses the authenticated Firebase ID token.

## Localization best practices
- Keep UI strings in `web/src/i18n/uiCopy.ts`; avoid hard-coding labels inside components.
- For translated site content, mirror the schema per locale (e.g., `siteContent/public/translations/ja`) and keep keys consistent.
- Default to English when translations are absent; prefer full-sentence keys to preserve Japanese line breaks.
- Ship locale files through CI (export/import JSON) to keep translators and releases in sync.

## Firebase Hosting rewrite
Requests to `/api/**` are proxied to the Cloud Run service `denuo-api` in `us-central1` via the `firebase.json` rewrite. Update `serviceId`/`region` if you change the Cloud Run deployment.

## Quick start (minimal local preview)
1. `npm install` in both `web/` and `api/`.
2. For a zero-config preview, skip env files and run `npm run dev` in `web/`; the site will use bundled fallback content and disable saves/admin actions (auth/API not configured).
3. To enable live Firestore/auth, fill `web/.env` with Firebase web config.
4. (Optional) Set `VITE_USE_FIREBASE_EMULATORS=true` and run `firebase emulators:start --only auth,firestore` for local auth/content editing.
5. Run `npm run dev` in `web/` for the SPA; run `npm run dev` in `api/` for the API.
6. Visit `/admin` to sign in and edit content (admin claim required to save to Firestore).

## Terraform scaffold
- See `infra/terraform/README.md` for automating API enablement, deploy service account, Artifact Registry, and pushing GitHub Actions secrets (including Stripe). Squarespace DNS is not managed; migrate DNS to a Terraform-capable provider if you want full automation for records.
