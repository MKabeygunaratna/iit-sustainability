# IIT Sustainability Survey — Vercel + PostgreSQL

A complete Next.js survey for an independent IIT coursework project. It has all 20 supplied questions, responsive landing page, five-step form, encrypted storage, a passcode-protected results area, percentage charts, simple keyword grouping of written ideas, possible repeated-IP review, individual deletion, removable sample data, and CSV export. The IIT wordmark in this student project is typographic; no official institution logo asset is included.

## Where do submissions go?

On Vercel, a visitor's browser sends the form to `/api/submit`. The server validates every answer, reads the IP supplied by Vercel, encrypts the answers and IP, computes a keyed IP fingerprint for possible repeat review, then inserts one row in **your Neon PostgreSQL database**. Vercel runs the website and API; it does not hold the permanent survey rows. The admin results API reads those rows from Neon. The database connection string and secrets exist only in Vercel's server-side environment variables.

The database holds ciphertext, timestamps, a `is_demo` marker, and a keyed IP fingerprint. The dashboard can decrypt responses with `DATA_ENCRYPTION_KEY`. CSV contains the decrypted IP and full answers, so protect downloaded copies. A shared IP can belong to many people on campus Wi-Fi; rows are flagged for manual review and never automatically discarded. If Vercel cannot supply a valid IP, the response is still saved with `IP unavailable`.

## Tech stack

- Next.js App Router + React + TypeScript; custom CSS and Lucide icons
- Next.js Node.js route handlers on Vercel
- Neon hosted PostgreSQL (free tier available) with `pg`; local PostgreSQL via Docker Compose
- AES-256-GCM encryption for answers and IP; HMAC-SHA256 fingerprint for IP grouping
- Signed, HttpOnly admin session cookie; database-backed login attempt limit

## Run locally with Docker

1. Install Node.js 22 or newer, npm, and Docker Desktop with Compose.
2. Unzip the project, open a terminal in this directory, and run `npm install`.
3. Copy `.env.example` to `.env.local`. Keep the local `DATABASE_URL` from the example.
4. Generate **three different** secrets by running the following command three times, pasting one result into each of `DATA_ENCRYPTION_KEY`, `IP_HASH_KEY`, and `SESSION_SECRET` in `.env.local`:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

5. Set `SURVEY_PASSCODE` to your own long, unique passcode. Save it in a password manager. Do not commit `.env.local`.
6. Run:

   ```bash
   docker compose up -d
   npm run db:migrate
   npm run dev
   ```

7. Visit `http://localhost:3000`. The first homepage visit adds 24 fictional responses, including four pairs sharing example IPs. Open `/insights` and enter your passcode. Sample data is clearly labelled; use **Clear sample data** before collecting real responses.

You can also develop locally against Neon: put its pooled PostgreSQL connection string in your local `.env.local` and skip Docker. Be aware that local test submissions will then enter that same Neon database.

## Publish on Vercel with Neon

1. Create a free project at [Neon](https://neon.tech/). Copy the **pooled** PostgreSQL connection string from Connection Details (normally a `-pooler` host with `sslmode=require`). Keep it private.
2. On your computer, replace `DATABASE_URL` in `.env.local` with that Neon URL and run `npm run db:migrate` **once against Neon**. This creates the three tables and indexes. Re-running is safe.
3. Put this folder in a private or public GitHub repository. `.gitignore` excludes `.env.local`; inspect commits before pushing. The source itself contains no production password or database credential.
4. In [Vercel](https://vercel.com/), choose **Add New Project → Import Git Repository** and select this repo. Framework preset: **Next.js**. Root directory: repository root. Build command: `npm run build` (default is also fine).
5. Add these Vercel project environment variables to **Production** (and Preview if you plan to collect preview data):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string |
   | `DATA_ENCRYPTION_KEY` | Your first 32-byte base64url secret |
   | `IP_HASH_KEY` | A different 32-byte base64url secret |
   | `SESSION_SECRET` | A third 32-byte base64url secret |
   | `SURVEY_PASSCODE` | Your chosen private results passcode |

6. Deploy. Vercel gives you a public `*.vercel.app` URL reachable from anywhere. Open the homepage once to add the demo rows, then check `/insights` and clear demos before sharing the survey. For previews, use a separate Neon branch/database if you want their submissions isolated from production.

If you change an environment variable later, redeploy for the new value to take effect. Losing or changing `DATA_ENCRYPTION_KEY` makes existing stored answers and IPs unreadable. Changing `IP_HASH_KEY` stops grouping old and new submissions under the same fingerprint. Changing `SESSION_SECRET` signs out current admin sessions. Set `SURVEY_PASSCODE` to a new value to rotate access.

## Database access and data controls

Neon Console → your project → **SQL Editor** lets you inspect schema and row counts:

```sql
SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_demo) AS samples FROM responses;
SELECT id, created_at, is_demo, ip_hash FROM responses ORDER BY created_at DESC LIMIT 20;
```

Answers and IPs are encrypted, so use the protected dashboard or CSV export to read them. The dashboard's **Clear sample data** deletes only `is_demo = true` rows. To manually clear sample rows in SQL: `DELETE FROM responses WHERE is_demo = true;` Do not run a broad `DELETE` on real responses unless you intend permanent removal. The dashboard can add the same fictional sample set again after clearing it.

The existing ChatGPT Sites version uses a separate Cloudflare D1 database. Deploying this source creates a new Neon-backed survey and **does not move existing responses**. If you need those old submissions, export them from the old protected CSV and plan a deliberate import before publishing the new URL.

## Privacy and operational notes

The page says the survey asks for no name, email, or student ID, but an IP is personal information and is collected only with the participant's acknowledgement. Written answers can still contain identifying details, so the form asks participants to avoid them. HTTPS protects traffic on Vercel, AES-GCM protects answers and IP in the database, and the keyed fingerprint supports repeat review. Database administrators and anyone with the encryption key and database access can still decrypt records; there is no absolute anonymity guarantee. Publish a contact/retention statement and obtain any coursework or ethics approval required for your study before distributing the survey.

The sample IPs use reserved documentation addresses (`192.0.2.0/24`), not real people's IPs. Results pages and CSV endpoints check the signed admin cookie on the server. Login is limited to seven failed attempts per 15 minutes per IP. The form uses a hidden honeypot field and server-side answer validation; for a larger public survey you may add CAPTCHA or Vercel rate limiting.

Vercel and Neon free allowances can change. Check each provider's current pricing and Vercel Hobby eligibility before publishing. Always export a backup of real responses before deleting anything.

## Project map

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Homepage and first-time demo seed |
| `app/survey/page.tsx` | Survey form |
| `app/insights/page.tsx` | Passcode gate and dashboard |
| `lib/questions.ts` | Questions and server-side answer validation |
| `lib/server.ts` | Encryption, IP, sessions, login throttling |
| `lib/demo.ts` | 24 fictional submissions |
| `lib/db.ts` | PostgreSQL connection pool |
| `app/api/submit/route.ts` | Public submit API |
| `app/api/admin/` | Protected read, CSV, deletion, demo, login APIs |
| `db/schema.sql` | SQL schema |
| `scripts/migrate.mjs` | Repeatable schema setup |

To verify source locally: `npm run typecheck` and `npm run build`.
