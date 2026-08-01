# Bata CSR Portal

Management software for Bata's school partnership programme: Bata funds and manages
public schools through NGO partners. Directors, Bata employees, and NGOs plan
projects, schedule school activities with shared checklists, and track employee
volunteer hours.

Built with **Next.js 16** (App Router, Server Actions), **MongoDB** (Mongoose),
**Cloudflare R2** for photos, and **EmailJS** for credential emails.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run seed                 # creates the first director account
npm run dev                  # http://localhost:3000
```

Sign in at `/login` with the seeded director account
(default: `director@bata.com` / `Director@123` — change it in Settings).

## Roles

| Capability | Director | Employee | NGO |
|---|---|---|---|
| Create/edit/delete employees & NGOs, reset passwords | ✅ | — | — |
| Create/edit projects & schools | ✅ | view | — |
| Schedule/edit activities (school + NGO + participants + points) | ✅ | ✅ | — |
| See assigned activities & shared checklist | ✅ | ✅ | ✅ |
| Tick checklist points, add remarks, upload photos, update status | ✅ | ✅ | ✅ |
| Engagement reports (hours per employee, by project & category) | ✅ | own stats | — |
| Change own password | ✅ | ✅ | ✅ |

Accounts are created by the director; new accounts get a temporary password
(emailed via EmailJS when configured, and always shown once on screen) and must
change it at first login.

## Environment (.env.local)

- `MONGODB_URI` — local MongoDB or Atlas connection string
- `SESSION_SECRET` — long random string (`openssl rand -base64 32`)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` —
  Cloudflare R2 credentials (optional; photo uploads are skipped when unset)
- `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`,
  `EMAILJS_PRIVATE_KEY` — EmailJS (optional; the EmailJS template must use the
  variables `to_email`, `to_name`, `subject`, `message`)
- `DIRECTOR_NAME` / `DIRECTOR_EMAIL` / `DIRECTOR_PASSWORD` — used by `npm run seed`

## Architecture notes

- **Auth**: stateless JWT session cookie (`jose`), bcrypt password hashes.
  `proxy.ts` does the optimistic redirect; every page/action re-verifies the
  user against the database in `lib/session.ts` (`requireUser`).
- **Server Actions** in `lib/actions/*` handle all mutations with per-role checks.
- **Time tracking**: completed activities × duration × participants, aggregated
  in `/dashboard/reports` (week / month / last month / all time).
- **Images** are stored in R2 and served through `/api/files/[key]`, which
  redirects to a short-lived presigned URL (sign-in required).
# bata-app
