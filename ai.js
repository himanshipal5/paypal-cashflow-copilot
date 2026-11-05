// ai.js
// This file asks the AI to turn a normal sentence into invoice data.

require('dotenv').config();

const apiKey = process.env.AI_API_KEY;
const mainModel = process.env.AI_MODEL;
const backupModel = process.env.AI_BACKUP_MODEL;

// A small helper that pauses for some milliseconds
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

// Send one request to one specific model
async function askModel(modelName, requestBody) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    modelName +
    ':generateContent';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  return { response: response, data: data };
}

async function parseInvoiceText(userText) {
  // These are our instructions to the AI
  const instructions =
    'You read a freelancer\'s request and extract invoice details. ' +
    'Reply with JSON only, in exactly this shape: ' +
    '{"customer_name": string, "customer_email": string or null, ' +
    '"items": [{"name": string, "quantity": number, "unit_price": number}], ' +
    '"currency": string, "due_in_days": number or null}. ' +
    'If no currency is mentioned, use "USD". ' +
    'If something is not mentioned, use null. Do not invent details.';

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: instructions + '\n\nRequest: ' + userText }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  };

  // Make a list of models to try: the main one first, then the backup
  const modelsToTry = [];
  if (mainModel) {
    modelsToTry.push(mainModel);
  }
  if (backupModel) {
    modelsToTry.push(backupModel);
  }

  let lastError = 'No AI model is set in the .env file';

  for (const modelName of modelsToTry) {
    // Try each model up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await askModel(modelName, requestBody);

      // It worked, so read the answer and return it
      if (result.response.ok) {
        const answerText = result.data.candidates[0].content.parts[0].text;
        const invoiceData = JSON.parse(answerText);
        return invoiceData;
      }

      // It failed, so remember why
      lastError =
        'AI error ' + result.response.status + ' (' + modelName + '): ' +
        JSON.stringify(result.data);

      // 503 means busy and 429 means too many requests. Those are worth retrying.
      const isBusy = result.response.status === 503 || result.response.status === 429;

      if (!isBusy) {
        // A different kind of error, so retrying won't help. Move to the next model.
        break;
      }

      // Wait 2 seconds, then 4 seconds, then 6 seconds before trying again
      console.log('AI is busy, retrying (' + modelName + ', attempt ' + attempt + ')');
      await wait(attempt * 2000);
    }
  }

  // Nothing worked, so report the last error
  throw new Error(lastError);
}

module.exports = { parseInvoiceText };