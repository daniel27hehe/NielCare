// IMPORTANT: Use environment variables, NOT hardcoded API keys!
// See .env.example for setup instructions

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set.');
  console.error('Please add it to your .env.local file.');
  console.error('See .env.example for template.');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'hello' }] }] })
}).then(r => r.json()).then(console.log).catch(console.error);
