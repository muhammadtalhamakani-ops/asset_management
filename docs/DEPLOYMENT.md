# Temporary public demo

FieldStock runs on this Windows PC. Cloudflare Quick Tunnel publishes the production frontend and `/api` using one random HTTPS `trycloudflare.com` address. Keep the PC awake, connected, and the demo process running. Restarting the tunnel normally changes the address; Quick Tunnels are for temporary demonstrations.

## Prepare

Install root and backend dependencies using `npm.cmd ci` in each directory. In `backend/.env`, retain the existing `MONGODB_URI` and configure a private random `SESSION_SECRET` of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`; never commit it. Changing the secret invalidates existing sessions. Environment loading happens before authentication initialization, including when tests import authentication directly.

Download the official Windows AMD64 cloudflared executable into `.tools/cloudflared.exe` from https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe. `.tools/` and `.demo/` are ignored. No domain, Cloudflare login, or inbound router port is required for Quick Tunnel.

## Start and stop

From the repository root run `powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1`. The script builds the frontend, checks that port 5000 is available, starts the backend hidden, waits for database/catalog initialization, and runs the tunnel in the foreground. Copy the HTTPS URL printed by cloudflared. Ctrl+C ends the foreground tunnel and the script's finally block stops its backend; if the terminal is forcibly terminated, check for leftover processes before restarting. Do not stop unrelated Node processes.

The script sets `SERVE_FRONTEND=true`, `ALLOW_REGISTRATION=false`, `HOST=127.0.0.1`, and `PORT=5000` for its backend. Existing accounts can log in. Public registration returns 403 by default and is always disabled when serving the frontend, even if `ALLOW_REGISTRATION=true`. New team accounts must be provisioned privately; never use the destructive seed script against this database.

The backend serves only `dist/`, and attachments remain behind authenticated API routes. It does not expose the source tree or upload directory as static files. `/api/health` returns 503 until MongoDB and catalog initialization are ready, then 200 with `databaseReady: true`. Authenticated reads must still be checked to verify account access. Data and attachments remain on the existing database/disk; authorized demo writes affect that real data.

## Development and configuration

Frontend requests default to `/api`; Vite proxies this path to `http://127.0.0.1:5000` during development. Optional `VITE_API_BASE_URL` overrides the API URL at build time and must never contain secrets. For normal development, leave `SERVE_FRONTEND=false` and start the backend and Vite separately. Without frontend serving, CORS allows the standard localhost/127.0.0.1 Vite origin on port 5173; demo mode sends no cross-origin CORS permission. The backend binds to loopback by default, with an explicit `HOST` override available for other hosting arrangements.

## Verification

Run root `npm.cmd run lint`, `npm.cmd run build`, backend `npm.cmd run test:demo`, syntax checks for modified backend files, and `git diff --check`. On the public URL check the login page, invalid login, a real team login, dashboard, and existing records. Check that anonymous domain requests and attachments return 401, registration returns 403, and source/config paths do not expose files. Only test uploads/edits with disposable records. No database integration suite should run without its explicit disposable test database URI.
