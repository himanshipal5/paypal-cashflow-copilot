// summary.js
// This file works out the numbers for the cash-flow summary.
// We do the maths here in code, so the AI only has to write the words.

// Invoice statuses that mean "the customer still owes money"
const outstandingStatuses = ['SENT', 'UNPAID', 'PARTIALLY_PAID', 'PAYMENT_PENDING'];

// Invoice statuses that mean "the customer has paid"
const paidStatuses = ['PAID', 'MARKED_AS_PAID'];

// Today's date, with the time cut off
function getToday() {
  const todayText = new Date().toISOString().slice(0, 10);
  return new Date(todayText + 'T00:00:00Z');
}

// Get the customer's name, or their email if there is no name
function getCustomer(invoice) {
  if (invoice.primary_recipients && invoice.primary_recipients[0]) {
    const billing = invoice.primary_recipients[0].billing_info || {};
    if (billing.name && billing.name.full_name) {
      return billing.name.full_name;
    }
    if (billing.email_address) {
      return billing.email_address;
    }
  }
  return 'Unknown customer';
}

// How much the customer still owes on this invoice
function getAmountOwed(invoice) {
  if (invoice.due_amount && invoice.due_amount.value) {
    return Number(invoice.due_amount.value);
  }
  if (invoice.amount && invoice.amount.value) {
    return Number(invoice.amount.value);
  }
  return 0;
}

function getCurrency(invoice) {
  if (invoice.amount && invoice.amount.currency_code) {
    return invoice.amount.currency_code;
  }
  return 'USD';
}

// Go through all invoices and count up the facts
function buildFacts(invoices) {
  const today = getToday();

  const facts = {
    total_invoices: invoices.length,
    draft_count: 0,
    paid_count: 0,
    outstanding_count: 0,
    outstanding_by_currency: {},
    overdue: [],
    due_soon: [],
  };

  invoices.forEach(function (invoice) {
    const status = invoice.status;

    if (status === 'DRAFT') {
      facts.draft_count = facts.draft_count + 1;
      return;
    }

    if (paidStatuses.includes(status)) {
      facts.paid_count = facts.paid_count + 1;
      return;
    }

    // Ignore anything else that is not waiting for payment (cancelled, refunded...)
    if (!outstandingStatuses.includes(status)) {
      return;
    }

    // From here on, the customer still owes money
    facts.outstanding_count = facts.outstanding_count + 1;

    const currency = getCurrency(invoice);
    const owed = getAmountOwed(invoice);

    if (!facts.outstanding_by_currency[currency]) {
      facts.outstanding_by_currency[currency] = 0;
    }
    facts.outstanding_by_currency[currency] = facts.outstanding_by_currency[currency] + owed;

    // Find the due date, if there is one
    let dueDate = null;
    if (invoice.detail && invoice.detail.payment_term && invoice.detail.payment_term.due_date) {
      dueDate = invoice.detail.payment_term.due_date;
    }

    if (!dueDate) {
      return;
    }

    // How many days until it is due? Negative means it is already late.
    const due = new Date(dueDate + 'T00:00:00Z');
    const daysLeft = Math.round((due - today) / (1000 * 60 * 60 * 24));

    const line = {
      invoice_number: invoice.detail.invoice_number,
      customer: getCustomer(invoice),
      amount: owed.toFixed(2) + ' ' + currency,
      due_date: dueDate,
      days_left: daysLeft,
    };

    if (daysLeft < 0) {
      facts.overdue.push(line);
    } else if (daysLeft <= 7) {
      facts.due_soon.push(line);
    }
  });

  return facts;
}

module.exports = { buildFacts };