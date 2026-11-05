# PayPal Cash-Flow Copilot

Type a normal sentence like "Invoice Rohan $50 for logo design, due in 10 days". The AI reads it, you check the details, and PayPal creates and sends the invoice.

**Live demo:** https://paypal-cashflow-copilot.onrender.com
(It runs on a free plan, so the first load can take up to a minute while it wakes up. Sandbox only: no real money is used.)

**Demo video:** 

## Why I built it

Freelancers lose time writing invoices and chasing payments. This app turns one sentence into a real PayPal invoice, with a confirm step so the AI never sends anything by itself.

## How it works

1. You type a request in plain English.
2. The Gemini API turns it into structured invoice data (customer, items, price, currency, due date).
3. You review and edit the details in a confirm form.
4. The backend creates the invoice with the PayPal Invoicing API and sends it.
5. The dashboard lists your invoices and their status, loaded straight from PayPal.

## Tools used

- **PayPal Invoicing API (sandbox):** creates, sends and lists invoices.
- **Google Gemini API (free tier):** reads the user's sentence and returns JSON. The code retries when the model is busy and falls back to a backup model.
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
   - `PAYPAL_TEST_CUSTOMER_EMAIL`: the email of a sandbox personal account
   - `AI_API_KEY`: a free key from Google AI Studio
   - `AI_MODEL` and `AI_BACKUP_MODEL`: Gemini model names
3. Start it:
   ```
   npm start
   ```
4. Open http://localhost:3000

## API routes

| Route | What it does |
|---|---|
| `POST /api/parse-invoice` | AI turns a sentence into invoice data (creates nothing) |
| `POST /api/invoices/create` | Creates a draft invoice in PayPal from confirmed data |
| `POST /api/invoices/:id/send` | Sends a draft invoice to the customer |
| `GET /api/invoices/:id` | Gets one invoice |
| `GET /api/invoices` | Lists invoices for the dashboard |

## Things to know

- This runs in the PayPal **sandbox** only.
- PayPal does not allow sending invoices to customers inside India, so the test customer is a US sandbox account.
- If no customer email is given, the demo uses a test customer email.
- Invoices are read from PayPal, so there is no separate database.

## Built by

Himanshi Pal. See `DEVLOG.md` for how I built it and the problems I ran into.

## License

MIT