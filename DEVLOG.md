# Dev Log

## 4 Nov
- Created the repository and set up the Node project.
- Connected to the PayPal sandbox and got an access token.

## 4 Nov (later)
- Built paypal.js helper and an Express server with /health
- Created first draft invoice through the PayPal Invoicing API (route: POST /api/test-invoice)


## 5 Nov: Things broke, then worked

**Problem 1: invoice would not send.**
PayPal returned `INR_FOREIGN_CURRENCY_BLOCKED`: invoices can't be sent to customers inside India, and both of my sandbox accounts were set to India.
Fix: kept the India business app and used a US personal sandbox account as the customer. It also fits the real use case, since freelancers usually invoice international clients.

**Problem 2: new US app gave 403 NOT_AUTHORIZED.**
I tried making a new app on a US business account. I ticked Invoicing in the app features, but it still failed. Wrote `paypal-check.js` to print the scopes (permissions) the token really has. There was no invoicing scope in the list. I didn't find the cause in the time I had, so I parked that app and went back to the first app, which was already allowed to create invoices.
Lesson: when an API says "not authorized", check the token's real scopes instead of guessing.

**AI part: Gemini free tier.**
Got a free key from Google AI Studio and wrote `ai.js`. It sends the sentence to the model and gets back JSON (customer, items, currency, due in days). Works well on my test sentence.
Hit a `503: high demand` error from Google. So `ai.js` now retries up to 3 times with a longer wait each time, then falls back to a backup model.

**Connecting AI to PayPal.**
- `invoice.js` checks the data (name, items, quantity and price above 0) and builds the body PayPal wants. Due date is calculated from "due in N days".
- New route `/api/invoices/create` makes the draft, and the send route sends it.
- Tested the full flow with curl: sentence, AI, checked data, draft, sent. Status came back `SENT` with the right due date.

**Dashboard (working).**
Plain HTML page served by Express: type a request, check and edit the AI's answer in a confirm form, then create and send. Plus a table of invoices loaded straight from PayPal. Tested in the browser: typed "Invoice Rohan $75 for website banner, due in 7 days", confirmed it, and it showed up as SENT with the right due date. The table shows the customer email instead of the name because PayPal's list API doesn't return the name.