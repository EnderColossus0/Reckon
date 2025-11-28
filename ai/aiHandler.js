const fetch = require('node-fetch');
const memory = require('../memory/memoryManager');

const SYSTEM_PROMPT = `You are Outlaw, a helpful and friendly AI assistant in a Discord server. You have memory and remember things about users.

MEMORY INSTRUCTIONS:
- When a user shares personal info (name, interests, job, preferences), remember it
- Use what you know about them naturally in conversation
- To save a new fact, include [REMEMBER: the fact] at the end of your message
- Only remember important, long-term facts - not temporary things
- Be conversational, helpful, and reference past chats when relevant
- Keep responses concise but friendly`;

const gemini = {
  async chat(prompt, context) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const fullPrompt = context 
      ? `${SYSTEM_PROMPT}\n\n${context}\nUser's message: ${prompt}`
      : `${SYSTEM_PROMPT}\n\nUser: ${prompt}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }
};

const groq = {
  async chat(prompt, context) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Missing GROQ_API_KEY');

    const systemMsg = context 
      ? `${SYSTEM_PROMPT}\n\n${context}`
      : SYSTEM_PROMPT;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`Groq API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  }
};

const userModels = new Map();

function extractFacts(text) {
  const facts = [];
  const regex = /\[REMEMBER:\s*(.+?)\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    facts.push(match[1].trim());
  }
  return facts;
}

function cleanResponse(text) {
  return text.replace(/\[REMEMBER:\s*.+?\]/gi, '').trim();
}

module.exports = {
  setModel(userId, model) {
    if (['gemini', 'groq'].includes(model)) {
      userModels.set(userId, model);
      return true;
    }
    return false;
  },

  getModel(userId) {
    return userModels.get(userId) || 'gemini';
  },

  async chat(userId, message) {
    const model = this.getModel(userId);
    
    const facts = await memory.getFacts(userId);
    const history = await memory.getHistory(userId, 6);
    const context = memory.buildContext(facts, history);
    
    console.log(`[AI] User ${userId} | Model: ${model} | Facts: ${facts.length} | History: ${history.length}`);
    
    let reply = null;
    let success = false;

    try {
      if (model === 'gemini') {
        reply = await gemini.chat(message, context);
      } else {
        reply = await groq.chat(message, context);
      }
      success = true;
    } catch (err) {
      console.log(`[AI] ${model} failed, trying fallback...`);
      try {
        if (model === 'gemini') {
          reply = await groq.chat(message, context);
        } else {
          reply = await gemini.chat(message, context);
        }
        success = true;
      } catch (fallbackErr) {
        console.error('[AI] Both models failed:', fallbackErr.message);
        return 'Sorry, I had trouble responding. Please try again.';
      }
    }

    if (success && reply) {
      const newFacts = extractFacts(reply);
      for (const fact of newFacts) {
        await memory.addFact(userId, fact);
      }
      
      const cleanReply = cleanResponse(reply);
      await memory.addToHistory(userId, message, cleanReply);
      
      return cleanReply;
    }

    return reply || 'I couldn\'t generate a response.';
  },

  async clearMemory(userId) {
    await memory.clearUser(userId);
  },

  async getKnowledge(userId) {
    return await memory.getFacts(userId);
  }
};
