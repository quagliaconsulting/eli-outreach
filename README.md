# eli-outreach

ELI Outreach is the shipper business-development ops console for Elberta Logistics International (ELI). It is a phone-first, copy-only workstation: **this application never sends email**.

Seeded accounts are fictional and stamped **EXAMPLE DATA**. Do not treat them as live shippers.

## What it does

Pages:

- **Today** — phone-first call queue, drafts to approve, copy-ready mail, Replied accounts
- **Pipeline** — Working / Next up / Backfill
- **Campaigns** — drafts inbox with approve / copy / mark sent. There is no Send
- **DNC** — suppressions that block first-touch
- **Settings** — sender name/phone plus locked From, Reply-To, timezone, packet URL, and the fleet-counts toggle (default **OFF**)

Hard rules:

- No SMTP, Gmail API, or any outbound mail
- Never invent emails. If none is on file, the UI says so
- CRM records are allowed only after status is **Replied**
- DNC matches on company, contact, email, or phone and blocks first-touch
- First-touch copy is a locked template. Only the hook line is authored
- No LTL lead and no site-visit language in first-touch
- From / Reply-To is always `max@elbertalogistics.net`
- Packet URL is always `https://elbertalogistics.com/services/`
- Timezone is `America/New_York`

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
