const fetch = require('node-fetch');
const memory = require('../memory/memoryManager');

const SYSTEM_PROMPT = `You are Outlaw, a friendly AI assistant with a great memory. You remember users and build relationships with them over time.

YOUR MEMORY ABILITIES:
- You remember everything users tell you about themselves
- You ALWAYS reference facts you know about different users in your responses
- You recognize returning users and greet them personally
- You use ALL known facts from the community to provide informed, personalized responses
- When someone mentions another user or topic related to stored facts, bring them up naturally

USING EXISTING KNOWLEDGE:
The context below contains:
1. FACTS I KNOW ABOUT USERS - Facts from ALL users in the community (reference these frequently!)
2. SPECIFIC FACTS ABOUT THIS USER - Personal facts about the current user
3. OUR RECENT CONVERSATION - Past messages with this user

CRITICAL INSTRUCTION - SHARED MEMORY:
You have access to facts about OTHER USERS. If the current user mentions another user, their interests, or topics related to stored facts, ALWAYS bring up what you know. This creates a shared community memory.

Example:
- If User A said "I love gaming" and User B asks about gaming, say "I know another user loves gaming too!"
- Build connections between users by referencing what you know about them

HOW TO ADD NEW KNOWLEDGE:
When a user tells you something important about themselves (name, job, hobbies, preferences, location, pets, family, etc.), use [REMEMBER: the fact].

Examples of [REMEMBER:]:
- User says "My name is Alex" → Include [REMEMBER: User's name is Alex]
- User says "I love gaming" → Include [REMEMBER: User loves gaming]

IMPORTANT:
- Use [REMEMBER: ...] when you learn something new about ANY user
- FREQUENTLY reference facts you know about other users when relevant to the conversation
- Be friendly and conversational
- Keep responses helpful and concise
- ALWAYS acknowledge shared knowledge when appropriate`;

const gemini = {
  async chat(prompt, context) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const fullPrompt = context 
      ? `${SYSTEM_PROMPT}\n\n${context}\n\nUser's current message: ${prompt}\n\nRemember: If the user shares personal info, include [REMEMBER: fact] in your response.`
      : `${SYSTEM_PROMPT}\n\nUser: ${prompt}\n\nRemember: If the user shares personal info, include [REMEMBER: fact] in your response.`;

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
      const errorText = await res.text();
      console.error('[Gemini] API Error:', res.status, errorText);
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
          { role: 'user', content: `${prompt}\n\n(Remember: If I share personal info, include [REMEMBER: fact] in your response)` }
        ]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Groq] API Error:', res.status, errorText);
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
  return text.replace(/\[REMEMBER:[\s\S]*?\]/gi, '').trim();
}

module.exports = {
  setModel(userId, model) {
    if (['groq', 'gemini'].includes(model)) {
      userModels.set(userId, model);
      return true;
    }
    return false;
  },

  getModel(userId) {
    return userModels.get(userId) || 'groq';
  },

  getModelInfo(userId) {
    const model = this.getModel(userId);
    if (model === 'gemini') {
      return 'Gemini 2.0 Flash';
    } else if (model === 'groq') {
      return 'Llama 3.3 70B Versatile';
    }
    return model;
  },

  async chat(userId, message) {
    const model = this.getModel(userId);
    
    const facts = await memory.getFacts(userId);
    const history = await memory.getHistory(userId, 6);
    const allSharedFacts = await memory.getAllUserFacts();
    const context = await memory.buildContext(facts, history, allSharedFacts);
    
    console.log(`[AI] User ${userId} | Model: ${model} | User Facts: ${facts.length} | Shared Facts: ${allSharedFacts.length} | History: ${history.length}`);
    
    let reply = null;
    let success = false;

    try {
      if (model === 'gemini') {
        reply = await gemini.chat(message, context);
      } else {
        reply = await groq.chat(message, context);
      }
      success = true;
      console.log(`[AI] ${model} responded successfully`);
    } catch (err) {
      console.log(`[AI] ${model} failed: ${err.message}, trying fallback...`);
      try {
        if (model === 'gemini') {
          reply = await groq.chat(message, context);
        } else {
          reply = await gemini.chat(message, context);
        }
        success = true;
        console.log(`[AI] Fallback succeeded`);
      } catch (fallbackErr) {
        console.error('[AI] Both models failed:', fallbackErr.message);
        return 'Sorry, I had trouble responding. Please try again.';
      }
    }

    if (success && reply) {
      const newFacts = extractFacts(reply);
      console.log(`[AI] Extracted ${newFacts.length} facts from response`);
      
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
  },

  async getUserColor(userId) {
    return await memory.getUserColor(userId);
  },

  async getUserEmbedTitle(userId) {
    return await memory.getUserEmbedTitle(userId);
  },

  async getUserEmbedFooter(userId) {
    return await memory.getUserEmbedFooter(userId);
  }
};
