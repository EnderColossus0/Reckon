const fetch = require('node-fetch');

// ======================
// Gemini AI Module
// ======================
const gemini = {
  async query(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key missing in .env');

    try {
      // Verify endpoint matches latest Google Gemini API docs
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
        }
      );

      if (!res.ok) {
        console.error('Gemini fetch failed:', res.status, res.statusText);
        throw new Error(`Gemini API request failed: ${res.status}`);
      }

      const data = await res.json();
      try {
        return data.candidates[0].content.parts[0].text || "Gemini returned empty response.";
      } catch (err) {
        console.error('Gemini parsing error:', data, err);
        return "Gemini could not respond.";
      }

    } catch (err) {
      console.error('Gemini fetch error:', err);
      throw err; // propagate to fallback
    }
  }
};

// ======================
// Groq AI Module
// ======================
const groq = {
  async query(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing in .env');

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) {
        console.error('Groq fetch failed:', res.status, res.statusText);
        return "Groq API request failed.";
      }

      const data = await res.json();
      try {
        return data.choices[0].message.content || "Groq returned empty response.";
      } catch (err) {
        console.error('Groq parsing error:', data, err);
        return "Groq could not respond.";
      }
    } catch (err) {
      console.error('Groq fetch error:', err);
      return "Groq could not respond.";
    }
  }
};

// ======================
// In-memory user models
// ======================
const userModels = new Map();

// ======================
// AI Handler
// ======================
module.exports = {
  // Set user's preferred AI model
  setActiveModelForUser(userId, model) {
    if (!['gemini', 'groq'].includes(model)) {
      console.warn(`Unknown model "${model}" passed for user ${userId}`);
      return;
    }
    userModels.set(userId, model);
  },

  // Get active model for user, default to Gemini
  async getActiveModelForUser(userId) {
    return userModels.get(userId) || 'gemini';
  },

  // Main AI response function
  async generateAIResponse(userId, prompt) {
    const model = await this.getActiveModelForUser(userId);
    let response = null;

    try {
      if (model === 'gemini') response = await gemini.query(prompt);
      else if (model === 'groq') response = await groq.query(prompt);
      else response = await gemini.query(prompt); // fallback
    } catch (err) {
      console.warn(`Primary model (${model}) failed, trying fallback...`, err);

      // Fallback
      try {
        if (model === 'gemini') response = await groq.query(prompt);
        else response = await gemini.query(prompt);
      } catch (fallbackErr) {
        console.error('Both AI models failed:', fallbackErr);
        response = "Both AI models failed to respond.";
      }
    }

    return response || "AI returned no response.";
  }
};