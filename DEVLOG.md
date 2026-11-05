# Dev Log

## 4 Nov
- Created the repository and set up the Node project.
- Connected to the PayPal sandbox and got an access token.

## 4 Nov (later)
- Built paypal.js helper and an Express server with /health
- Created first draft invoice through the PayPal Invoicing API (route: POST /api/test-invoice)

## 5 Nov
- Fixed the "invoices to India blocked" error by using a US personal sandbox account as the customer
- Added routes to get and send an invoice
- Created and SENT a real sandbox invoice through the PayPal Invoicing API