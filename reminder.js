// reminder.js
// This file prepares the facts the AI needs to write a reminder for one invoice.

function buildReminderFacts(invoice) {
  // Today's date, with the time cut off
  const todayText = new Date().toISOString().slice(0, 10);
  const today = new Date(todayText + 'T00:00:00Z');

  // The customer's name, if PayPal gave us one
  let customerName = null;
  if (invoice.primary_recipients && invoice.primary_recipients[0]) {
    const billing = invoice.primary_recipients[0].billing_info || {};
    if (billing.name && billing.name.full_name) {
      customerName = billing.name.full_name;
    }
  }

  // How much is still owed
  let amountOwed = '0';
  let currency = 'USD';
  if (invoice.due_amount) {
    amountOwed = invoice.due_amount.value;
    currency = invoice.due_amount.currency_code;
  } else if (invoice.amount) {
    amountOwed = invoice.amount.value;
    currency = invoice.amount.currency_code;
  }

  // The due date and how many days are left (negative means late)
  let dueDate = null;
  let daysLeft = null;
  let situation = 'no_due_date';

  if (invoice.detail && invoice.detail.payment_term && invoice.detail.payment_term.due_date) {
    dueDate = invoice.detail.payment_term.due_date;
    const due = new Date(dueDate + 'T00:00:00Z');
    daysLeft = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      situation = 'overdue';
    } else if (daysLeft <= 7) {
      situation = 'due_soon';
    } else {
      situation = 'not_due_yet';
    }
  }

  return {
    customer_name: customerName,
    invoice_number: invoice.detail ? invoice.detail.invoice_number : null,
    amount_owed: amountOwed + ' ' + currency,
    due_date: dueDate,
    days_left: daysLeft,
    situation: situation,
  };
}

module.exports = { buildReminderFacts };