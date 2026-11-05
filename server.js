// server.js
// This is our Express server. It listens for requests.

require('dotenv').config();
const express = require('express');
const { paypalRequest } = require('./paypal');

const app = express();
app.use(express.json());

// Route 1: a simple check to see if the server is alive
app.get('/health', function (req, res) {
  res.json({ status: 'ok' });
});

// Route 2: create a test draft invoice in the PayPal sandbox
app.post('/api/test-invoice', async function (req, res) {
  try {
    // Step 1: ask PayPal for the next invoice number
    const numberResponse = await paypalRequest(
      '/v2/invoicing/generate-next-invoice-number',
      'POST'
    );
    const invoiceNumber = numberResponse.invoice_number;

    // Step 2: describe the invoice we want to create
    const invoiceData = {
      detail: {
        invoice_number: invoiceNumber,
        currency_code: 'USD',
      },
      primary_recipients: [
        {
          billing_info: {
            email_address: process.env.PAYPAL_TEST_CUSTOMER_EMAIL,
          },
        },
      ],
      items: [
        {
          name: 'Logo design',
          quantity: '1',
          unit_amount: {
            currency_code: 'USD',
            value: '50.00',
          },
        },
      ],
    };

    // Step 3: send it to PayPal to create the draft invoice
    const draftInvoice = await paypalRequest(
      '/v2/invoicing/invoices',
      'POST',
      invoiceData
    );

    // Step 4: send PayPal's answer back to whoever called us
    res.json(draftInvoice);
  } catch (error) {
    console.log('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Route 3: get the details of one invoice (so we can see its status)
app.get('/api/invoices/:id', async function (req, res) {
  try {
    // The invoice id comes from the web address
    const invoiceId = req.params.id;

    const invoice = await paypalRequest(
      '/v2/invoicing/invoices/' + invoiceId,
      'GET'
    );

    res.json(invoice);
  } catch (error) {
    console.log('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Route 4: send a draft invoice to the customer
app.post('/api/invoices/:id/send', async function (req, res) {
  try {
    const invoiceId = req.params.id;

    // Tell PayPal to email the invoice to the customer
    const sendOptions = {
      send_to_recipient: true,
      send_to_invoicer: false,
    };

    const result = await paypalRequest(
      '/v2/invoicing/invoices/' + invoiceId + '/send',
      'POST',
      sendOptions
    );

    res.json(result);
  } catch (error) {
    console.log('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
// Start the server
const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log('Server running on http://localhost:' + port);
});