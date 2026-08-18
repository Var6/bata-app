# Bata CSR Portal

Management software for the **Bata Children's Program**: Bata funds community
projects delivered by NGO partners. The CSR team creates projects and assigns each
to a partner; the NGO schedules the activities on the ground; Bata employees follow
the causes they care about, get invited, and turn up.

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

| Capability | CSR Team | Employee | NGO |
|---|---|---|---|
| Create / edit / suspend / delete projects | ✅ | — | — |
| Onboard NGO partners, reset passwords | ✅ | — | — |
| See a project | all | all | **only their own** |
| Schedule activities (date, time, location) | ✅ | — | — |
| Edit activities / record what happened | ✅ | — | ✅ (own projects) |
| Follow a project to get invited | ✅ | ✅ | — |
| Confirm / decline attendance | ✅ | ✅ | — |
| Record who actually attended | ✅ | — | ✅ |
| Engagement reports + PDF export | ✅ | own stats | — |
| Edit own name, email, password, photo | ✅ | ✅ | ✅ |

Employees **self-register** at `/signup` with their Bata employee code (each code can
only be used once). NGO accounts are created by the CSR team.

## The activity lifecycle

1. CSR team creates a project, assigns it to one NGO partner, and sets its location.
2. Employees browse projects and press **I'm interested** to follow one.
3. The Bata admin schedules an activity — date, time, and a pasted Google Maps link.
4. Everyone following that project is notified and can confirm.
5. Each confirmation notifies **only that project's NGO** — never all partners.
6. When the activity is completed, the NGO records who actually turned up.
7. Only NGO-confirmed attendance counts towards volunteer hours in reports.

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
- **Time tracking**: hours count only where the NGO marked the volunteer present.
  Reports cover week / month / last month / quarter / all time and export to PDF
  via `pdf-lib` at `/dashboard/reports/pdf`.
- **Locations** live on projects and activities, with an optional pasted Google
  Maps link so volunteers can navigate. (There is no separate "schools" module —
  Bata works with more than schools.)
- **Images** are stored in R2 and served through `/api/files/[key]`, which
  redirects to a short-lived presigned URL (sign-in required).
# bata-app
