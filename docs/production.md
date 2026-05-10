# Adhyayan Production Deployment Guide

## Hosting shape

- `frontend/`: deploy as a Vercel project with root directory `frontend`.
- `backend/`: deploy as a second Vercel project with root directory `backend`.
- `MongoDB`: use MongoDB Atlas with automated backups enabled.
- `Uploads`: switch `UPLOAD_STORAGE_DRIVER=s3` and configure a private S3-compatible bucket such as Cloudflare R2 or AWS S3.

This repo is now prepared for a **two-project Vercel deployment**. The frontend project proxies `/api/*` to the backend project so browser requests stay same-origin and cookie auth remains reliable.

## Required production environment settings

### Backend

- `NODE_ENV=production`
- `JWT_SECRET` must be a long non-placeholder value.
- `CLIENT_URLS` should contain the production frontend origin.
- `TRUST_PROXY=1` when the backend is behind a reverse proxy or managed ingress.
- `SEED_ADMIN_BOOTSTRAP=false` after the first real admin account exists.
- `NOTIFICATION_CHANNELS=in-app`
- `UPLOAD_STORAGE_DRIVER=s3`
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `SERVER_PUBLIC_URL` should match the production API origin.
- `PUBLIC_API_BASE_URL=/api` so backend-generated download URLs stay same-origin through the frontend proxy
- `ALLOW_GEMINI_CLOUD_AI=true` and/or `ALLOW_NVIDIA_CLOUD_AI=true` if you want live AI in production
- `GEMINI_API_KEY`, `GEMINI_REASONING_MODEL`, `GEMINI_MULTIMODAL_MODEL` as needed
- `NVIDIA_API_KEY`, `NVIDIA_REASONING_MODEL`, `NVIDIA_MULTIMODAL_MODEL` as needed

### Frontend

- `NEXT_PUBLIC_API_URL=/api`
- `API_PROXY_TARGET=https://<your-backend-project>.vercel.app`
- `NEXT_PUBLIC_LOGIN_SCENE_URL`
- `NEXT_PUBLIC_STUDENT_SCENE_URL`
- `NEXT_PUBLIC_IMAGE_HOSTS`

## Production defaults and safety rails

- Image and voice doubt uploads should stay disabled in production until consent, retention, and scanning are approved:
  - `ENABLE_AI_IMAGE_DOUBTS=false`
  - `ENABLE_AI_VOICE_DOUBTS=false`
- If you deploy to Vercel with `UPLOAD_STORAGE_DRIVER=local`, the backend will now auto-disable image and voice uploads instead of failing startup.
- If you do want production image or voice uploads on Vercel, switch to S3-compatible storage first.
- Enable malware-scan hooks before allowing production uploads:
  - `ENABLE_UPLOAD_MALWARE_SCAN_HOOK=true`
  - `UPLOAD_MALWARE_SCAN_ENDPOINT=<scanner endpoint>`
- Keep `NOTIFICATION_CHANNELS=in-app` unless real email/SMS delivery is implemented and tested.

## Readiness checks

- `GET /health/live`: process liveness
- `GET /health/ready`: database readiness plus storage and AI configuration summary

Use the readiness endpoint in the platform health checks and only route traffic after it returns `200`.

## Auth and account lifecycle

- No public signup is supported.
- Admins create users through invite-based setup links.
- Password resets invalidate active sessions through `tokenVersion` revocation.
- Deactivating a user immediately revokes access on the next request.

## File storage model

- Uploads are private assets with authenticated download routes.
- Do not expose the local `uploads/` directory publicly in production.
- On Vercel production, move to S3-compatible storage before launch.

## Vercel project setup

1. Import the repository into Vercel twice.
2. Set the first project's Root Directory to `backend`.
3. Set the second project's Root Directory to `frontend`.
4. Create the backend project first so you know its production URL.
5. In the frontend project env vars, set `API_PROXY_TARGET` to the backend project URL.
6. In the frontend project env vars, set `NEXT_PUBLIC_API_URL=/api`.
7. In the backend project env vars, set `CLIENT_URLS` to the frontend production origin.
8. In the backend project env vars, set `PUBLIC_API_BASE_URL=/api`.
9. Redeploy both projects after setting env vars.

## Clean account reset

- To wipe starter data and create one clean starter account per role, run:
  - `npm run reset:accounts --workspace backend`
- This clears existing starter users, attendance, doubts, practice sets, analytics, notifications, tokens, and uploads before recreating the baseline accounts.

## Backup and restore

- Enable daily MongoDB Atlas snapshots and point-in-time restore if available.
- Enable bucket versioning or lifecycle snapshots for uploaded files.
- Test one restore drill before launch and once per quarter afterward.

## Release checklist

1. Run `npm ci`
2. Run `npm test --workspace backend`
3. Run `npm run build`
4. Verify `/health/ready` in staging
5. Smoke test login, admin provisioning, teacher attendance, student AI chat, and parent analytics
6. Promote the same build artifact or commit to production

## Current residual risk

- `npm audit --omit=dev` currently reports a moderate advisory through Next.js' nested `postcss` pin.
- CI is configured to fail only on high-and-above production vulnerabilities until the Next.js dependency tree ships a patched nested `postcss`.
