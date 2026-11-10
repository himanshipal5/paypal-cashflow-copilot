// paypal.js
// This file talks to PayPal for us.

require('dotenv').config();

// Read our settings from the .env file
const baseUrl = process.env.PAYPAL_BASE_URL;
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// We keep the access token here, so we do not ask PayPal for a new one every time
let savedToken = null;
let savedTokenExpiresAt = 0; // the time (in milliseconds) when the saved token stops being valid

// A small helper that pauses for some milliseconds
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

// Ask PayPal for a brand new token (one attempt)
async function requestNewToken() {
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

  return { response: response, data: data };
}

// Get an access token: reuse the saved one if it is still good, otherwise ask PayPal
async function getAccessToken() {
  // Use the saved token if it has more than 60 seconds left
  if (savedToken && Date.now() < savedTokenExpiresAt - 60000) {
    return savedToken;
  }

  let lastError = '';

  // Try up to 3 times, in case PayPal says no for a moment
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await requestNewToken();

    if (result.response.ok) {
      savedToken = result.data.access_token;
      savedTokenExpiresAt = Date.now() + result.data.expires_in * 1000;
      return savedToken;
    }

    lastError =
      'Could not get token (attempt ' + attempt + '): ' + JSON.stringify(result.data);
    console.log(lastError);

    // Wait 1 second, then 2 seconds, before the next try
    await wait(attempt * 1000);
  }

  throw new Error(lastError);
}

// A helper we can use to call any PayPal API
async function paypalRequest(path, method, body) {
  // Try up to 2 times. If PayPal says our token is no good (401),
  // we throw the saved token away and try once more with a fresh one.
  for (let attempt = 1; attempt <= 2; attempt++) {
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

    // The saved token was refused, so forget it and try again
    if (response.status === 401 && attempt === 1) {
      savedToken = null;
      continue;
    }

    // If PayPal says no, stop and show the reason
    if (!response.ok) {
      throw new Error('PayPal error ' + response.status + ': ' + JSON.stringify(data));
    }

    return data;
  }
}

// Let other files use these two functions
module.exports = { getAccessToken, paypalRequest };