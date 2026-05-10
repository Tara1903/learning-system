# Adhyayan Learning System

Premium educational SaaS platform for coaching institutes serving Class 1 to 12 with AI-guided learning, attendance, analytics, parent visibility, and institutional-grade dashboards.

## Workspace layout

- `backend/` Express + MongoDB + JWT RBAC + free-first AI services
- `frontend/` Next.js + Tailwind + Zustand + Motion + branded scene surfaces

## Vercel deployment shape

- Create **two Vercel projects** from this same repository:
  - one with root directory `backend`
  - one with root directory `frontend`
- The frontend should stay the public app domain.
- The frontend now proxies `/api/*` to the backend project, so cookie auth stays same-origin in the browser.

## Quick start

### With npm

1. Run `setup.bat` or `npm install` in the project root.
2. Copy `backend/.env.example` to `backend/.env`.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. Start both apps with `npm run dev:npm`.
5. Or just double-click `start.bat`.

When the apps start:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`

If you want to open them separately:

- Backend only:
  `cd backend`
  `npm run dev`
- Frontend only:
  `cd frontend`
  `npm run dev`

Helpful npm commands:

- `npm run build:npm`
- `npm run test:npm`
- `npm start`
- `npm run start:backend:npm`
- `npm run start:frontend:npm`

Windows helpers:

- `setup.bat` installs dependencies, creates local env files, and cleans old pnpm workspace metadata before npm install
- `start.bat` starts backend + frontend together
- `build.bat` runs the workspace build
- `test.bat` runs backend tests

### With pnpm

1. Install dependencies in the root workspace with `pnpm install`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. Run `pnpm dev:backend` and `pnpm dev:frontend`.

## Notes

- No paid AI key is required to boot the app. With no cloud keys configured, Adhyayan uses deterministic fallback guidance so every route still works.
- `NEXT_PUBLIC_LOGIN_SCENE_URL` and `NEXT_PUBLIC_STUDENT_SCENE_URL` are optional hosted scene URLs for richer visual surfaces. Leave them blank to use the built-in branded fallback.
- `NEXT_PUBLIC_IMAGE_HOSTS` can be set to a comma-separated allowlist of remote image hostnames for production-safe Next image loading.
- Backend uploads default to local storage. `UPLOAD_STORAGE_DRIVER=s3` remains optional for teams that want S3-compatible object storage later.
- Local uploads are fine for local development, but **not** for Vercel production. If you deploy to Vercel without S3-compatible storage, image and voice uploads are now auto-disabled so the app still boots cleanly. Configure storage such as Cloudflare R2 to re-enable them.
- If you do not have MongoDB installed locally, the backend now falls back faster to its embedded development database. You can tune that wait with `MONGO_SERVER_SELECTION_TIMEOUT_MS`.
- The AI stack is provider-neutral. You can run with no keys, Gemini only, NVIDIA only, or both:
  - Gemini: good free-tier path for text, image, and voice understanding when privacy settings explicitly allow cloud use
  - NVIDIA: optional cloud path for text and audio-capable multimodal requests when enabled
- In privacy-first mode, configured cloud keys stay blocked until you explicitly allow them in `backend/.env`.
- The frontend default API path is now `/api`, with `API_PROXY_TARGET` controlling where the frontend proxies requests during local development and Vercel production.
- Admins now provision users through invite-based password setup links instead of temporary passwords.
- To reset the starter database to one clean account per role, run:
  - `npm run reset:accounts --workspace backend`
- Health endpoints are available at `/health/live` and `/health/ready`.
- Production deployment notes live in `docs/production.md`.
