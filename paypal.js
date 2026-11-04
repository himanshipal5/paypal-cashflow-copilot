// paypal.js
// This file talks to PayPal for us.

require('dotenv').config();

// Read our settings from the .env file
const baseUrl = process.env.PAYPAL_BASE_URL;
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// Ask PayPal for an access token (a temporary pass to use the API)
async function getAccessToken() {
  // PayPal wants "clientId:clientSecret" converted to base64 format
  const credentials = clientId + ':' + clientSecret;
  const encodedCredentials = Buffer.from(credentials).toString('base64');

  const response = await fetch(baseUrl + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + encodedCredentials,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  // If PayPal says no, stop and show the reason
  if (!response.ok) {
    throw new Error('Could not get token: ' + JSON.stringify(data));
  }

  return data.access_token;
}

//  A helper we can use to call any PayPal API
async function paypalRequest(path, method, body) {
  // Get a fresh token first
  const token = await getAccessToken();

  const options = {
    method: method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  };

  // Only send a body if we have one
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(baseUrl + path, options);
  const text = await response.text();

  // Some PayPal replies are empty, so check before reading them
  let data = {};
  if (text) {
    data = JSON.parse(text);
  }

  // If PayPal says no, stop and show the reason
  if (!response.ok) {
    throw new Error('PayPal error ' + response.status + ': ' + JSON.stringify(data));
  }

  return data;
}

// Let other files use these two functions
module.exports = { getAccessToken, paypalRequest };