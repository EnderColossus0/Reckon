const fetch = require('node-fetch');
const memory = require('../memory/memoryManager');

const geminiCall = async (prompt, imageData = null) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  let body;
  if (imageData) {
    body = {
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: imageData.mimeType, data: imageData.buffer } }
        ]
      }]
    };
  } else {
    body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `API error: ${res.status}`;
    throw new Error(`Gemini: ${errorMsg}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
};

const groqCall = async (prompt) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `API error: ${res.status}`;
    throw new Error(`Groq: ${errorMsg}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
};

module.exports = {
  async generate(userId, prompt, imageData = null) {
    const model = await memory.getToolModel(userId);
    console.log(`[ToolHandler] User ${userId} | Model: ${model}`);

    let reply = null;

    try {
      if (model === 'groq') {
        if (imageData) {
          console.log('[ToolHandler] Groq does not support images, falling back to Gemini');
          reply = await geminiCall(prompt, imageData);
        } else {
          reply = await groqCall(prompt);
        }
      } else {
        reply = await geminiCall(prompt, imageData);
      }
      console.log(`[ToolHandler] ${model} succeeded`);
    } catch (err) {
      console.log(`[ToolHandler] ${model} failed: ${err.message}, trying fallback...`);
      try {
        if (model === 'groq') {
          reply = await geminiCall(prompt, imageData);
        } else {
          reply = await groqCall(prompt);
        }
        console.log('[ToolHandler] Fallback succeeded');
      } catch (fallbackErr) {
        console.error('[ToolHandler] Both models failed:', fallbackErr.message);
        throw new Error(fallbackErr.message);
      }
    }

    return reply;
  }
};
