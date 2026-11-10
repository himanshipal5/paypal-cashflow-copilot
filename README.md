# PayPal Cash-Flow Copilot

Type a normal sentence like "Invoice Rohan $50 for logo design, due in 10 days". The AI reads it, you check the details, and PayPal creates and sends the invoice. It also summarises your cash flow, drafts payment reminders, and shows payments the moment they happen.

**Live demo:** https://paypal-cashflow-copilot.onrender.com
(It runs on a free plan, so the first load can take up to a minute while it wakes up. Sandbox only: no real money is used.)

**Demo video:** 

## Screenshots


## Why I built it

Freelancers lose time writing invoices and chasing late payments. This app turns one sentence into a real PayPal invoice, and helps follow up on unpaid ones. The AI never acts by itself: a person always confirms or approves first, and the numbers are calculated by code, not by the AI.

## What it does

- **Create invoices from a sentence.** The AI reads the request, you check and edit the details, and only then is the invoice created and sent through PayPal.
- **Invoice dashboard.** Lists your invoices with their status (DRAFT, SENT, PAID) and due date, loaded straight from PayPal. Late invoices get an OVERDUE tag.
- **Cash-flow summary.** Totals, overdue invoices and invoices due soon are calculated in code. The AI only writes a short explanation and a suggested next step.
- **AI-drafted reminders.** For an unpaid invoice the AI drafts a polite reminder. You can edit it, and PayPal sends it only after you approve.
- **Live payment updates.** When a customer pays, PayPal calls the server through a webhook. The dashboard shows it under Live activity and refreshes the table.

## How it works

1. You type a request in plain English.
2. The Gemini API turns it into structured invoice data (customer, items, price, currency, due date).
3. You review and edit the details in a confirm form.
4. The backend checks the data, then creates the invoice with the PayPal Invoicing API and sends it.
5. The dashboard lists your invoices and their status, loaded straight from PayPal.
6. When a customer pays, PayPal sends a webhook to the server. The server asks PayPal to verify the signature, ignores duplicate events, and the dashboard updates.

## Tools used

- **PayPal Invoicing API (sandbox):** creates, sends, lists invoices and sends reminders.
- **PayPal webhooks:** tell the server when an invoice is paid, refunded or cancelled.
- **Google Gemini API (free tier):** reads the user's sentence into JSON, writes the cash-flow summary text, and drafts reminders. The code retries when the model is busy and falls back to a backup model.
- **Node.js and Express:** the backend and the API routes.
- **Plain HTML, CSS and JavaScript:** the dashboard.
- **Render:** hosting.

## Run it yourself

1. Clone the repo and install:
   ```
   git clone https://github.com/himanshipal5/paypal-cashflow-copilot.git
   cd paypal-cashflow-copilot
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the values:
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from an app in the PayPal developer dashboard (sandbox, with Invoicing turned on)
   - `PAYPAL_BASE_URL` (`https://api-m.sandbox.paypal.com`)
   - `PAYPAL_TEST_CUSTOMER_EMAIL`: the email of a sandbox personal account (use a US account, see "Things to know")
   - `PAYPAL_WEBHOOK_ID`: only needed for webhooks (see below)
   - `AI_API_KEY`: a free key from Google AI Studio
   - `AI_MODEL` and `AI_BACKUP_MODEL`: Gemini model names
3. Start it:
   ```
   npm start
   ```
4. Open http://localhost:3000

### Webhooks

 When a customer pays, PayPal sends a webhook to the server. The server verifies the signature, ignores duplicates, and the dashboard shows the payment under Live activity and updates the table.

Webhooks only work on a public web address, because PayPal cannot reach `localhost`. To use them on your own deployment:

1. In your PayPal sandbox app, add a webhook with the URL `https://YOUR-APP-ADDRESS/api/webhooks/paypal`.
2. Subscribe to the invoice paid, refunded and cancelled events.
3. Copy the Webhook ID into `PAYPAL_WEBHOOK_ID`.

Without this, everything else still works. You just will not see live payment updates, and the invoice table updates when you refresh.

## API routes

| Route | What it does |
|---|---|
| `GET /health` | Says the server is alive |
| `POST /api/parse-invoice` | AI turns a sentence into invoice data (creates nothing) |
| `POST /api/invoices/create` | Creates a draft invoice in PayPal from confirmed data |
| `POST /api/invoices/:id/send` | Sends a draft invoice to the customer |
| `GET /api/invoices/:id` | Gets one invoice |
| `GET /api/invoices` | Lists invoices for the dashboard |
| `GET /api/summary` | Numbers worked out in code, plus a written summary from the AI |
| `POST /api/invoices/:id/draft-reminder` | AI drafts a reminder (sends nothing) |
| `POST /api/invoices/:id/remind` | Sends the approved reminder through PayPal |
| `POST /api/webhooks/paypal` | Receives PayPal webhooks after verifying the signature |
| `GET /api/events` | Recent webhook events for the Live activity box |

## Things to know

- This runs in the PayPal **sandbox** only. No real money is used.
- PayPal does not allow sending invoices to customers inside India, so the test customer is a US sandbox account.
- If no customer email is given, the demo uses a test customer email.
- Invoices are read from PayPal, so there is no separate database.
- Webhook events are kept in memory only, so they are cleared when the app restarts.
- There is no login: the app uses one seller account (set in the environment variables). A real version would let each freelancer connect their own PayPal account.
- If the live demo shows a PayPal credentials error ("Could not get token"), the sandbox login has expired on my side. The demo video shows the full flow, and the steps above run the app locally.

## Built by

Himanshi Pal. See `DEVLOG.md` for how I built it and the problems I ran into.

## License

MIT