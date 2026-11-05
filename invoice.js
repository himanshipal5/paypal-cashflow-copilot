// invoice.js
// This file checks invoice data and turns it into the format PayPal wants.

// Add some days to today's date and return it like 2026-11-15
function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// Look at the invoice data and return a problem message, or null if all is fine
function checkInvoiceData(data) {
  if (!data) {
    return 'No invoice data was sent.';
  }

  if (!data.customer_name) {
    return 'Customer name is missing.';
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    return 'At least one item is needed.';
  }

  for (const item of data.items) {
    if (!item.name) {
      return 'Every item needs a name.';
    }
    if (!(Number(item.quantity) > 0)) {
      return 'Every item needs a quantity above 0.';
    }
    if (!(Number(item.unit_price) > 0)) {
      return 'Every item needs a price above 0.';
    }
  }

  return null;
}

// Turn our invoice data into the body PayPal expects
function buildPaypalInvoice(data, invoiceNumber) {
  const currency = data.currency || 'USD';

  // If the AI found no email, use our test customer email (demo only)
  const email = data.customer_email || process.env.PAYPAL_TEST_CUSTOMER_EMAIL;

  // PayPal wants quantity as text and the price as text with 2 decimals
  const paypalItems = data.items.map(function (item) {
    return {
      name: item.name,
      quantity: String(item.quantity),
      unit_amount: {
        currency_code: currency,
        value: Number(item.unit_price).toFixed(2),
      },
    };
  });

  const detail = {
    invoice_number: invoiceNumber,
    currency_code: currency,
  };

  // Only add a due date if we have one
  if (data.due_in_days) {
    detail.payment_term = {
      term_type: 'DUE_ON_DATE_SPECIFIED',
      due_date: addDays(Number(data.due_in_days)),
    };
  }

  return {
    detail: detail,
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: data.customer_name },
          email_address: email,
        },
      },
    ],
    items: paypalItems,
  };
}

module.exports = { checkInvoiceData, buildPaypalInvoice };