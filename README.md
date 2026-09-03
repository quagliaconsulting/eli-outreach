# eli-outreach

ELI Outreach is a simple workstation for Max and Jim: **qualified decision-maker leads** with contact information and a ready first-touch email draft. **This application never sends email.** Copy into your own mail client, then mark sent.

Seeded accounts, when present, are fictional and stamped **EXAMPLE DATA**. Do not treat them as live shippers. `seedIfEmpty` does **not** insert fictional companies once the settings row exists — an empty real database is correct after purge. Operators add live accounts (`is_example = 0`) from the write APIs below.

## What it does

One main screen:

- **Qualified leads** — named transportation/logistics people at real plants (switchboard-only “Shipping” rows stay hidden)
- Each lead shows **company, person, title, phone, and email** (or clearly “no email on file — do not invent”)
- Each lead already has a **locked first-touch draft** (only the hook line varies)
- Each lead has a derived **quality score** (0–100) and an **A / B / C** tier, plus a short reason. Reachability (named work email > generic inbox > phone-only) is the biggest factor; named transportation titles, seniority, contact completeness, ELI-lane geography (GA / FL / NC / TX and the Southeast), and freight-fit industries also move the score. New leads are scored automatically on insert and on load — there is no manual step
- **Sort:** quality (best first, default), newest, or company name
- **Filter:** has email; by tier A / B / C. Open / Sent still splits unmarked vs marked-sent drafts
- Actions: **Approve**, **Copy**, **Mark sent**. There is no Send
- A small strip for sender name and phone

On load, any named lead without a first-touch draft gets one from the locked template. The hook is taken from notes when those notes are usable; otherwise a short place/industry line is used. DNC still blocks first-touch. Nothing is deleted.

Hard rules (enforced in code, not as a sermon in the header):

- No SMTP, Gmail API, or any outbound mail
- Never invent emails. If none is on file, the UI says so
- CRM records are allowed only after status is **Replied**
- DNC matches on company, contact, email, or phone and blocks first-touch
- First-touch copy is a locked template. Only the hook line is authored
- No LTL lead and no site-visit language in first-touch
- From / Reply-To is always `max@elbertalogistics.net`
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
5. Confirm `/api/health` returns `send: false`

`Dockerfile` is Node 20. `railway.toml` and `server.js` are in the repo root.

## Stack

Next.js (TypeScript App Router), custom Node server, SQLite via `better-sqlite3`.
