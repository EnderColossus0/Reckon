const fetch = require('node-fetch');
const memoryManager = require('../memory/memoryManager');

const SYSTEM_PROMPT = `You are Outlaw, a helpful and friendly AI assistant in a Discord server. You remember past conversations and facts about users.

IMPORTANT INSTRUCTIONS FOR MEMORY:
1. If a user tells you their name, interests, preferences, or any personal facts, remember them.
2. Reference past conversations naturally when relevant.
3. If you learn something new about a user (like their name, job, hobbies, favorite things), note it in your response by including [REMEMBER: fact here] at the end of your message. Only include facts worth remembering long-term.
4. Be conversational, helpful, and maintain continuity across chats.
5. Keep responses concise but friendly.`;

const gemini = {
  async query(prompt, context = '') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key missing');

    const fullPrompt = context ? 
      `${SYSTEM_PROMPT}\n\n${context}\nCurrent message from user: ${prompt}` : 
      `${SYSTEM_PROMPT}\n\nUser: ${prompt}`;

    try {
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
      throw err;
    }
  }
};

const groq = {
  async query(prompt, context = '') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key missing');

    const systemMessage = context ? 
      `${SYSTEM_PROMPT}\n\n${context}` : 
      SYSTEM_PROMPT;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!res.ok) {
        console.error('Groq fetch failed:', res.status, res.statusText);
        throw new Error(`Groq API request failed: ${res.status}`);
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
      throw err;
    }
  }
};

const userModels = new Map();

function extractRememberFacts(response) {
  const facts = [];
  const regex = /\[REMEMBER:\s*(.+?)\]/gi;
  let match;
  while ((match = regex.exec(response)) !== null) {
    facts.push(match[1].trim());
  }
  return facts;
}

function cleanResponse(response) {
  return response.replace(/\[REMEMBER:\s*.+?\]/gi, '').trim();
}

module.exports = {
  setActiveModelForUser(userId, model) {
    if (!['gemini', 'groq'].includes(model)) {
      console.warn(`Unknown model "${model}" passed for user ${userId}`);
      return;
    }
    userModels.set(userId, model);
  },

  async getActiveModelForUser(userId) {
    return userModels.get(userId) || 'gemini';
  },

  async generateAIResponse(userId, prompt) {
    const model = await this.getActiveModelForUser(userId);
    
    const conversationHistory = await memoryManager.getConversationHistory(userId, 8);
    const knowledge = await memoryManager.getKnowledge(userId);
    const userProfile = await memoryManager.getUserProfile(userId);
    
    console.log(`[Memory Debug] User ${userId}:`);
    console.log(`  - Conversations: ${conversationHistory.length}`);
    console.log(`  - Knowledge facts: ${knowledge.length}`);
    if (knowledge.length > 0) {
      console.log(`  - Facts: ${knowledge.map(k => k.fact).join(', ')}`);
    }
    
    const context = memoryManager.buildContextPrompt(conversationHistory, knowledge, userProfile);
    console.log(`[Memory Debug] Context length: ${context.length} chars`);
    
    let response = null;
    let success = false;

    try {
      if (model === 'gemini') {
        response = await gemini.query(prompt, context);
      } else if (model === 'groq') {
        response = await groq.query(prompt, context);
      } else {
        response = await gemini.query(prompt, context);
      }
      success = true;
    } catch (err) {
      console.warn(`Primary model (${model}) failed, trying fallback...`, err);
      try {
        if (model === 'gemini') {
          response = await groq.query(prompt, context);
        } else {
          response = await gemini.query(prompt, context);
        }
        success = true;
      } catch (fallbackErr) {
        console.error('Both AI models failed:', fallbackErr);
        response = "Both AI models failed to respond.";
        success = false;
      }
    }

    if (success && response) {
      const facts = extractRememberFacts(response);
      for (const fact of facts) {
        await memoryManager.addKnowledge(userId, fact);
        console.log(`Stored knowledge for user ${userId}: ${fact}`);
      }
      
      const cleanedResponse = cleanResponse(response);
      
      await memoryManager.addConversation(userId, prompt, cleanedResponse);
      
      return cleanedResponse;
    }

    return response || "AI returned no response.";
  },

  async clearUserMemory(userId) {
    await memoryManager.clearUserMemory(userId);
    return "Your memory has been cleared.";
  },

  async getUserKnowledge(userId) {
    return await memoryManager.getKnowledge(userId);
  }
};
