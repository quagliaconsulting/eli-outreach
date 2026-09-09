# eli-outreach

ELI Outreach is a simple workstation for Max and Jim: **qualified decision-maker leads** with contact information and a ready first-touch email draft. Approve / Copy / Mark sent stay on one screen. When Namecheap SMTP is configured and `SEND_ENABLED=true`, **Approve sends** the locked first-touch from `max@elbertalogistics.net`, then marks the draft sent. When send is off, Approve stays copy-only — copy into your own mail client, then mark sent.

Seeded accounts, when present, are fictional and stamped **EXAMPLE DATA**. Do not treat them as live shippers. `seedIfEmpty` does **not** insert fictional companies once the settings row exists — an empty real database is correct after purge. Operators add live accounts (`is_example = 0`) from the write APIs below.

## What it does

One main screen:

- **Qualified leads** — named transportation/logistics people at real plants (switchboard-only “Shipping” rows stay hidden)
- Each lead shows **company, person, title, phone, and email** (or clearly “no email on file — do not invent”)
- Each lead already has a **locked first-touch draft** (one of four industry templates — food & beverage, raw materials, chemical, or manufacturing)
- Each lead has a derived **quality score** (0–100) and an **A / B / C** tier, plus a short reason. Reachability (named work email > generic inbox > phone-only) is the biggest factor; named transportation titles, seniority, contact completeness, ELI-lane geography (GA / FL / NC / TX and the Southeast), and freight-fit industries also move the score. New leads are scored automatically on insert and on load — there is no manual step
- **Sort:** quality (best first, default), newest, or company name
- **Filter:** has email; by tier A / B / C. Open / Sent still splits unmarked vs marked-sent drafts
- Actions: **Approve**, **Copy**, **Mark sent**. When send is on, Approve transmits the locked draft via SMTP and marks it sent. Copy and Mark sent remain for manual fallback. When send is off, Approve only marks the draft approved
- A small strip for sender name and phone. Sender name is the From display name (default Maxwell Bacon). From / Reply-To stay `max@elbertalogistics.net` — never `sales@`

On boot and load, unsent first-touch drafts (`draft`, `approved`, `copied`, and still-open `blocked`) are rewritten to the current locked vertical copy so the console cannot stay on old wording. Drafts already `sent` are left alone. New named leads without a draft get one from the locked template. An internal hook may still be stored in `hook_line` / notes; it is not inserted into the email. DNC still blocks first-touch. Nothing is deleted.

Hard rules (enforced in code, not as a sermon in the header):

- SMTP credentials live in env vars only. Never hardcode passwords. The browser never sees SMTP secrets
- Send only when `SEND_ENABLED` is true and `SMTP_PASS` is set. Otherwise Approve stays copy-only — it does not silently no-op
- Never invent emails. If none is on file, Approve cannot send
- First-touch From / Reply-To is always `max@elbertalogistics.net`. `sales@` is an alias only — do not send as `sales@`
- Cloudflare Email Routing stays off. Do not reintroduce it
- CRM records are allowed only after status is **Replied**
- DNC matches on company, contact, email, or phone and blocks first-touch
- First-touch copy is a locked industry template. Do not sales-ify Max's wording. No hook line, packet URL, or 15-minute calendar ask in the email
- No LTL lead and no site-visit language in first-touch
- Packet URL `https://elbertalogistics.com/services/` may still be stored in settings; it is not part of first-touch
- Timezone is `America/New_York`
- Fleet counts default **OFF**

Locked first-touch — pick **one** vertical from `company.industry` plus name/notes heuristics (`selectVertical`). Fallback is Manufacturing.

Food and Beverage:

```
Subject: Temperature-controlled freight for {{Company}}
I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with food and beverage shippers such as Perdue, Tillamook, Reser's Fine Foods and Dole Fresh, moving everything from frozen ice cream at -20°F to fresh produce at 36°F.

We understand the cold chain, the delivery windows and the rejection risk that come with your products, and we build our capacity around them.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?
```

Raw Materials (steel/aluminum coils & tubing; scrap/metals that fit that messaging):

```
Subject: Coil and tubing freight for {{Company}}
I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with steel and aluminum producers such as Gerdau, Constellium and Reliance, transporting aluminum and steel coils and tubing.

We know the securement, weight and equipment requirements this freight demands, and we have the carrier network to handle it reliably.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?
```

Chemical (coatings, solvents, hazmat, paint, heat-treat chemistry when clearly chemical/coatings):

```
Subject: Hazmat and solvent freight for {{Company}}
I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We work with chemical and coatings companies such as Sherwin-Williams, AkzoNobel and Trinseo, transporting hazardous materials, solvents and paint-related products.

We understand the compliance, documentation and carrier vetting that hazmat freight requires, and we manage it as part of every shipment.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?
```

Manufacturing (default — auto, building products, packaging plants, furniture, lumber mills as building products, general mfg):

```
Subject: Manufacturing freight support for {{Company}}
I'm reaching out from Elberta Logistics, a freight solutions company with over 15 years in business. We support manufacturers on both the automotive side, including Adient, Flex-N-Gate and OpMobility, and the building products side, including Woodgrain, Stella-Jones and Weyerhaeuser.

We know how much your operations depend on freight arriving on time and intact, and we plan our capacity around your production schedules.

Would you be free for a quick introduction to see if Elberta's capabilities align with your current supply chain strategy?
```

Locked signature on every vertical (office + cell; cell is always present):

```
Thank you,

Maxwell Bacon
Director of Customer Sales, Elberta Logistics International Solutions LLC
850-692-2511 x 148
248-318-6170
```

Plain-text is the source of truth. The optional HTML part uses a boring system stack (`Arial, Helvetica, sans-serif`, 14px, line-height 1.45, `#222222`) with `white-space: pre-wrap`. No Georgia, colored buttons, or fancy headers.

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
