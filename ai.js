// ai.js
// This file asks the AI to turn a normal sentence into invoice data.

// This file talks to the AI. It has one shared function that handles
// retries and the backup model, and two jobs that use it.

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

// Ask the AI something and get the answer back as text.
// Set wantJson to true if we need the answer as JSON.
async function askAi(promptText, wantJson) {
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      temperature: wantJson ? 0 : 0.3,
    },
  };

  if (wantJson) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  // Make a list of models to try: the main one first, then the backup
  const modelsToTry = [];
  if (mainModel) {
    modelsToTry.push(mainModel);
  }
  if (backupModel) {
    modelsToTry.push(backupModel);
  }

  let lastError = 'No AI model is set in the environment variables';

  for (const modelName of modelsToTry) {
    // Try each model up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await askModel(modelName, requestBody);

      // It worked, so join the parts of the answer into one text and return it
      if (result.response.ok) {
        const parts = result.data.candidates[0].content.parts;
        let answerText = '';
        parts.forEach(function (part) {
          if (part.text) {
            answerText = answerText + part.text;
          }
        });
        return answerText;
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

      console.log('AI is busy, retrying (' + modelName + ', attempt ' + attempt + ')');
      await wait(attempt * 2000);
    }
  }

  // Nothing worked, so report the last error
  throw new Error(lastError);
}

// Job 1: turn a normal sentence into invoice data
async function parseInvoiceText(userText) {
  const instructions =
    'You read a freelancer\'s request and extract invoice details. ' +
    'Reply with JSON only, in exactly this shape: ' +
    '{"customer_name": string, "customer_email": string or null, ' +
    '"items": [{"name": string, "quantity": number, "unit_price": number}], ' +
    '"currency": string, "due_in_days": number or null}. ' +
    'If no currency is mentioned, use "USD". ' +
    'If something is not mentioned, use null. Do not invent details.';

  const answerText = await askAi(instructions + '\n\nRequest: ' + userText, true);
  return JSON.parse(answerText);
}

// Job 2: write a short cash-flow summary from numbers we already worked out
async function writeSummary(facts) {
  const instructions =
    'You are a friendly assistant for a freelancer. ' +
    'Below are facts about their invoices, already calculated. ' +
    'Write a short summary in plain English, at most 5 sentences. ' +
    'Use only the numbers given. Do not do your own maths and do not invent anything. ' +
    'Mention overdue invoices first if there are any. ' +
    'End with one clear suggested next step.';

  const answerText = await askAi(instructions + '\n\nFacts:\n' + JSON.stringify(facts, null, 2), false);
  return answerText.trim();
}

// Job 3: write a short, polite payment reminder from facts we already know
async function writeReminder(facts) {
  const instructions =
    'You write short, polite payment reminders for a freelancer. ' +
    'Reply with JSON only, in exactly this shape: {"subject": string, "note": string}. ' +
    'The note is at most 4 sentences. Use only the facts given. ' +
    'If the invoice is overdue, be polite but clear. Otherwise be friendly and light. ' +
    'If customer_name is null, start the note with "Hello,". ' +
    'Never use placeholders like [Name] or [Your Name]. ' +
    'Do not sign off with a name. Do not offer discounts and do not make threats.';

  const answerText = await askAi(instructions + '\n\nFacts:\n' + JSON.stringify(facts, null, 2), true);
  return JSON.parse(answerText);
}

module.exports = { parseInvoiceText, writeSummary, writeReminder };