// webhooks.js
// This file checks that a webhook really came from PayPal,
// and keeps a short list of recent events in memory.

require('dotenv').config();
const { getAccessToken } = require('./paypal');

const baseUrl = process.env.PAYPAL_BASE_URL;
const webhookId = process.env.PAYPAL_WEBHOOK_ID;

// Recent events, newest first (lost when the server restarts)
const recentEvents = [];

// Ids of events we already handled, so the same event is never counted twice
const seenEventIds = [];

// Ask PayPal: "did you really send this?" Returns true or false.
async function verifyWebhook(headers, rawBody) {
  if (!webhookId) {
    throw new Error('PAYPAL_WEBHOOK_ID is not set');
  }

  // PayPal puts these proof headers on every webhook call
  const authAlgo = headers['paypal-auth-algo'];
  const certUrl = headers['paypal-cert-url'];
  const transmissionId = headers['paypal-transmission-id'];
  const transmissionSig = headers['paypal-transmission-sig'];
  const transmissionTime = headers['paypal-transmission-time'];

  // If any proof is missing, it is not a real PayPal call
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }

  const token = await getAccessToken();

  // We build the request text by hand so the event is sent exactly as it arrived.
  // Re-writing it could change small details and break the signature check.
  const requestText =
    '{' +
    '"auth_algo":' + JSON.stringify(authAlgo) + ',' +
    '"cert_url":' + JSON.stringify(certUrl) + ',' +
    '"transmission_id":' + JSON.stringify(transmissionId) + ',' +
    '"transmission_sig":' + JSON.stringify(transmissionSig) + ',' +
    '"transmission_time":' + JSON.stringify(transmissionTime) + ',' +
    '"webhook_id":' + JSON.stringify(webhookId) + ',' +
    '"webhook_event":' + rawBody +
    '}';

  const response = await fetch(baseUrl + '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: requestText,
  });

  const data = await response.json();

  if (!response.ok) {
    console.log('Verify call failed:', JSON.stringify(data));
    return false;
  }

  return data.verification_status === 'SUCCESS';
}

// Save an event in our list. Returns false if we already had it.
function storeEvent(event) {
  // Idempotency: PayPal can send the same event twice, so ignore repeats
  if (seenEventIds.includes(event.id)) {
    return false;
  }

  seenEventIds.push(event.id);
  if (seenEventIds.length > 100) {
    seenEventIds.shift();
  }

  // The invoice details sit inside "resource", sometimes one level deeper
  const resource = event.resource || {};
  const invoice = resource.invoice || resource;

  let invoiceNumber = null;
  if (invoice.detail && invoice.detail.invoice_number) {
    invoiceNumber = invoice.detail.invoice_number;
  }

  let amount = null;
  if (invoice.amount && invoice.amount.value) {
    amount = invoice.amount.value + ' ' + invoice.amount.currency_code;
  }

  recentEvents.unshift({
    id: event.id,
    type: event.event_type,
    invoice_number: invoiceNumber,
    amount: amount,
    received_at: new Date().toISOString(),
  });

  // Keep only the 20 newest events
  if (recentEvents.length > 20) {
    recentEvents.pop();
  }

  return true;
}

function getRecentEvents() {
  return recentEvents;
}

module.exports = { verifyWebhook, storeEvent, getRecentEvents };