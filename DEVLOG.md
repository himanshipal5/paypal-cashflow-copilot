# Dev Log

## 4 Nov
- Created the repository and set up the Node project.
- Connected to the PayPal sandbox and got an access token.

## 4 Nov (later)
- Built paypal.js helper and an Express server with /health
- Created first draft invoice through the PayPal Invoicing API (route: POST /api/test-invoice)


## 5 Nov: Things broke, then worked

*Problem 1: invoice would not send.*
PayPal returned `INR_FOREIGN_CURRENCY_BLOCKED`: invoices can't be sent to customers inside India, and both of my sandbox accounts were set to India.
Fix: kept the India business app and used a US personal sandbox account as the customer. It also fits the real use case, since freelancers usually invoice international clients.

*Problem 2: new US app gave 403 NOT_AUTHORIZED.*
I tried making a new app on a US business account. I ticked Invoicing in the app features, but it still failed. Wrote `paypal-check.js` to print the scopes (permissions) the token really has. There was no invoicing scope in the list. I didn't find the cause in the time I had, so I parked that app and went back to the first app, which was already allowed to create invoices.
Lesson: when an API says "not authorized", check the token's real scopes instead of guessing.

*AI part: Gemini free tier.*
Got a free key from Google AI Studio and wrote `ai.js`. It sends the sentence to the model and gets back JSON (customer, items, currency, due in days). Works well on my test sentence.
Hit a `503: high demand` error from Google. So `ai.js` now retries up to 3 times with a longer wait each time, then falls back to a backup model.

*Connecting AI to PayPal.*
- `invoice.js` checks the data (name, items, quantity and price above 0) and builds the body PayPal wants. Due date is calculated from "due in N days".
- New route `/api/invoices/create` makes the draft, and the send route sends it.
- Tested the full flow with curl: sentence, AI, checked data, draft, sent. Status came back `SENT` with the right due date.

*Dashboard (working).*
Plain HTML page served by Express: type a request, check and edit the AI's answer in a confirm form, then create and send. Plus a table of invoices loaded straight from PayPal. Tested in the browser: typed "Invoice Rohan $75 for website banner, due in 7 days", confirmed it, and it showed up as SENT with the right due date. The table shows the customer email instead of the name because PayPal's list API doesn't return the name.

## 5 Nov (night)
- Deployed on Render (free plan): https://paypal-cashflow-copilot.onrender.com
- Tested the live app: the table loads, the AI reads the request, and a new invoice (0005) was created and sent
- The first AI request on the live site was slow (free plan waking up, plus Google being busy)

## 6 Nov
- Added a cash-flow summary. The server works out the totals and which invoices are overdue or due soon in code (summary.js); the AI only writes the words from those numbers
- The new Gemini model was often busy (503). I switched the main model to the older, steadier one, and made the summary route still return the numbers if the AI fails
- Moved the retry and backup-model logic in ai.js into one shared function used by both AI jobs

## 6 Nov (evening)
- Added AI-drafted reminders with approval. The "Draft reminder" button asks the AI to write a short message from the invoice facts, I can edit it, and only after I approve does PayPal send it (invoice remind API)
- Hit a bug: the button code was pasted above the wrong appendChild line, so no buttons showed. Replaced the whole loadInvoices function to fix it
- Dates and amounts are worked out in code (reminder.js); the AI only writes the words

## 9 Nov: Webhooks

- Added webhooks so the dashboard finds out about a payment without me refreshing. Before, the page only knew the status when it loaded.
- PayPal now calls my server at /api/webhooks/paypal when an invoice event happens (I subscribed to invoice paid, refunded and cancelled).
- The server does not trust the message straight away. It asks PayPal to verify the signature (webhooks.js) so someone cannot fake a "paid" event. I stored the Webhook ID as PAYPAL_WEBHOOK_ID in .env and in Render's environment variables.
- PayPal can send the same event twice, so the server remembers event ids and ignores repeats.
- The webhook route has to come before express.json() in server.js, because the signature check needs the raw text of the request.
- Events are kept in the server's memory only (no database), so they disappear when the app restarts. Fine for a demo.
- The dashboard has a "Live activity" box that checks for new events every 5 seconds and refreshes the invoice table when a payment arrives.
- Tested on the live site with a real sandbox payment: paid invoice 0009 as the customer, and Live activity showed "Invoice paid: invoice 0009 (35.00 USD)" while the table changed to PAID.
- I can't test webhooks on localhost, because PayPal cannot reach my laptop. Every test needed a push and a Render deploy.

## 9 and 10 Nov: Problem still open

- The live site keeps showing "Could not get token: invalid_client, Client Authentication failed". It happened during my interview too.
- What I tried: re-entering the Client ID and Secret in Render and in my local .env. It works again afterwards, then comes back after a while. I noticed it also seems to go away after logging in to PayPal again.
- I do not know the cause yet. My plan is to run node paypal-test.js on my laptop the next time it fails, before changing anything, to see if the problem is PayPal's side or Render's side.

## 10 Nov: Polish

- Rewrote public/index.html: blue banner, cards, coloured status badges (grey DRAFT, blue SENT, green PAID), a red OVERDUE tag, example sentences under the text box, number cards for the cash-flow summary, loading spinners, and friendlier error messages.
- Technical errors are still written to the browser console, so I can debug them.
- Checked the OVERDUE tag: invoice 0005 is due on 10 Nov, so it only counts as overdue from 11 Nov (an invoice due today is not late yet).

## 10 Nov: The credentials error is solved
- The "invalid_client / Client Authentication failed" error was caused by a wrong PAYPAL_BASE_URL. The value was https://sandbox.paypal.com (the website) instead of https://api-m.sandbox.paypal.com (the API). With the website address, even correct keys were rejected.
- I found it by testing on my laptop first with node paypal-test.js, then comparing the exact value of each variable with grep and node -e, instead of just re-entering keys again.
- Lesson: when an error looks like a credentials problem, check the address and every setting, not only the keys.n