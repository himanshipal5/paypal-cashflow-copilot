// paypal-check.js
// This file asks PayPal what permissions our app has.

require('dotenv').config();

async function checkScopes() {
  const credentials = process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET;
  const encodedCredentials = Buffer.from(credentials).toString('base64');

  const response = await fetch(process.env.PAYPAL_BASE_URL + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + encodedCredentials,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Permissions (scopes) this app has:');

  // The scope comes back as one long line, so split it into separate lines
  const scopeList = (data.scope || 'none').split(' ');
  scopeList.forEach(function (scope) {
    console.log(' - ' + scope);
  });
    // Show only the first 8 letters of the Client ID so we can compare it
  console.log('Client ID starts with:', process.env.PAYPAL_CLIENT_ID.slice(0, 8));
}

checkScopes();