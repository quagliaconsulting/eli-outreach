# eli-outreach

ELI Outreach is a simple workstation for Max and Jim: **qualified decision-maker leads** with contact information and a ready first-touch email draft. Approve / Copy / Mark sent stay on one screen. When Namecheap SMTP is configured and `SEND_ENABLED=true`, **Approve sends** the locked first-touch from `max@elbertalogistics.net`, then marks the draft sent. When send is off, Approve stays copy-only — copy into your own mail client, then mark sent.

Seeded accounts, when present, are fictional and stamped **EXAMPLE DATA**. Do not treat them as live shippers. `seedIfEmpty` does **not** insert fictional companies once the settings row exists — an empty real database is correct after purge. Operators add live accounts (`is_example = 0`) from the write APIs below.

## What it does

One main screen:

- **Qualified leads** — named transportation/logistics people at real plants (switchboard-only “Shipping” rows stay hidden)
- Each lead shows **company, person, title, phone, and email** (or clearly “no email on file — do not invent”)
- Each lead already has a **locked first-touch draft** (only the hook line varies)
- Each lead has a derived **quality score** (0–100) and an **A / B / C** tier, plus a short reason. Reachability (named work email > generic inbox > phone-only) is the biggest factor; named transportation titles, seniority, contact completeness, ELI-lane geography (GA / FL / NC / TX and the Southeast), and freight-fit industries also move the score. New leads are scored automatically on insert and on load — there is no manual step
- **Sort:** quality (best first, default), newest, or company name
- **Filter:** has email; by tier A / B / C. Open / Sent still splits unmarked vs marked-sent drafts
- Actions: **Approve**, **Copy**, **Mark sent**. When send is on, Approve transmits the locked draft via SMTP and marks it sent. Copy and Mark sent remain for manual fallback. When send is off, Approve only marks the draft approved
- A small strip for sender name and phone. Sender name is the From display name (default Max). From / Reply-To stay `max@elbertalogistics.net` — never `sales@`

On load, any named lead without a first-touch draft gets one from the locked template. The hook is taken from notes when those notes are usable; otherwise a short place/industry line is used. DNC still blocks first-touch. Nothing is deleted.

Hard rules (enforced in code, not as a sermon in the header):

- SMTP credentials live in env vars only. Never hardcode passwords. The browser never sees SMTP secrets
- Send only when `SEND_ENABLED` is true and `SMTP_PASS` is set. Otherwise Approve stays copy-only — it does not silently no-op
- Never invent emails. If none is on file, Approve cannot send
- First-touch From / Reply-To is always `max@elbertalogistics.net`. `sales@` is an alias only — do not send as `sales@`
- Cloudflare Email Routing stays off. Do not reintroduce it
- CRM records are allowed only after status is **Replied**
- DNC matches on company, contact, email, or phone and blocks first-touch
- First-touch copy is a locked template. Only the hook line is authored
- No LTL lead and no site-visit language in first-touch
- Packet URL is always `https://elbertalogistics.com/services/`
- Timezone is `America/New_York`
- Fleet counts default **OFF**

Locked first-touch:

```
Subject: {{Company}} truckload capacity — 15 minutes?
Hi {{FirstName}},
I am with Elberta Logistics International (ELI). We are an asset-based carrier and a freight brokerage — company trucks plus partner capacity — covering the 48 states, Canada, and Mexico.
I am reaching out because {{hook_line}}.
We also handle warehousing, drop trailer / trailer rental, drayage, and ocean when that is useful. Services overview: https://elbertalogistics.com/services/
Would you have 15 minutes this week for a short intro on how you move freight today and whether ELI is even relevant? Happy to work around your calendar.
Best,
{{SenderName}}
Business Development
Elberta Logistics International
{{SenderPhone}}
```

## Local development

Requires Node 20+.

```bash
npm ci
npm test
npm run dev
```

The custom server binds `0.0.0.0` and listens on `process.env.PORT`, falling back to **3737**.

SQLite lives under `/data` when that directory exists (Railway volume). Otherwise it uses `./data`. Override with `ELI_DATA_DIR` if needed.

Copy `.env.example` for local SMTP experiments. Do not commit a real mailbox password.

## SMTP (Namecheap Private Email)

Send is **server-side only**. Approve hits `/api/drafts/:id/approve`, which sends then marks sent. Credentials never go to the browser.

| Variable | Required to send | Example |
| --- | --- | --- |
| `SEND_ENABLED` | yes (`true` / `1` / `yes`) | `true` |
| `SMTP_PASS` | yes (mailbox app password) | set in Railway, never in git |
| `SMTP_HOST` | no (default `mail.privateemail.com`) | `mail.privateemail.com` |
| `SMTP_PORT` | no (default `465`) | `465` (SSL) or `587` (STARTTLS) |
| `SMTP_SECURE` | no (`true` when port is 465) | `true` |
| `SMTP_USER` | no (default `max@elbertalogistics.net`) | `max@elbertalogistics.net` |
| `SMTP_FROM` | unused for identity | From header is locked to `max@elbertalogistics.net` |

`GET /api/health` includes `send: true|false` — whether send is configured and enabled. It never returns host, user, or password.

Without `SEND_ENABLED=true` or without `SMTP_PASS`, `send` stays `false` and Approve keeps the copy-only path.

## Write path

Real shipper accounts are written with `is_example = 0`. Seed data is example-only and is never written through these endpoints.

`GET /api/leads` — named decision-maker workstation. Query:

- `filter` = `open` (default) | `sent` | `all`
- `sort` = `quality` (default, best first) | `added` | `company`
- `email` = `1` to keep only leads with an email on file
- `tier` = `A` | `B` | `C`

Each lead includes `quality: { score, tier, reason }`. The same object is on company payloads from `GET /api/companies` and `POST /api/companies`, so a new account is scored as soon as it is written.

`POST /api/companies` — create one real account. JSON body:

- `name` (required)
- `industry`, `city`, `state`, `phone`, `website`, `notes`
- `stage` (default `next_up`)
- `next_action_type` (default `call`)
- `next_action_at`
- `contact`: `{ first_name, last_name, title, phone, email }`

Email may be `null`. Incomplete or invented-looking emails are rejected (`assertRealEmail`). A switchboard contact (for example first name `Shipping` with no last name) is allowed when there is no named person. Those rows stay off the main lead list.

`POST /api/companies/bulk` — `{ "companies": [ ... ] }` same object shape, max 50, all-or-nothing transaction. Use this to load a review batch.

`POST /api/examples/purge` — permanently deletes every `is_example = 1` company and its contacts, drafts, activities, CRM records, and related DNC rows. Does not delete real (`is_example = 0`) rows. After purge, the next boot does not re-seed fake shippers.

## Railway — NEW project only

Deploy this repo to a **new** Railway project. Do **not** attach it to the existing Elberta Logistics production project.

Do not use, change, or reuse:

- Railway project **ElbertaLogistics**
- service **@blaster/server**
- hostname **app.elbertalogistics.net**

Intended public hostname for this console: **outreach.elbertalogistics.net**

Suggested new-project setup:

1. Create a brand-new Railway project (for example `eli-outreach`)
2. Deploy this GitHub repo from `main`
3. Attach a volume at `/data` so SQLite survives deploys
4. Set the custom domain to `outreach.elbertalogistics.net`
5. Confirm `/api/health` returns `send: false` until SMTP is turned on

### Turn on Approve → SMTP

Set these on the **eli-outreach** Railway service (not ElbertaLogistics / `@blaster/server`):

1. `SMTP_HOST=mail.privateemail.com`
2. `SMTP_PORT=465`
3. `SMTP_SECURE=true`
4. `SMTP_USER=max@elbertalogistics.net`
5. `SMTP_FROM=max@elbertalogistics.net`
6. `SMTP_PASS=<Namecheap Private Email app password>` — paste in Railway only
7. `SEND_ENABLED=true`
8. Redeploy (or restart) the service
9. Confirm `https://outreach.elbertalogistics.net/api/health` returns `"send": true`
10. On a lead with a published email, tap **Approve**. The locked draft goes out from `max@elbertalogistics.net` and the lead moves to Sent

DNC still blocks first-touch (quiet suppress). Leads with no email on file cannot be sent — do not invent an address. Copy and Mark sent still work if you need to send from a mail client instead.

`Dockerfile` is Node 20. `railway.toml` and `server.js` are in the repo root.

## Stack

Next.js (TypeScript App Router), custom Node server, SQLite via `better-sqlite3`.
