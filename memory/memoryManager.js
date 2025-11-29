const fs = require('fs');
const path = require('path');

let db = null;
let useReplitDB = false;

try {
  const Database = require('@replit/database');
  db = new Database();
  useReplitDB = true;
  console.log('[Memory] Using Replit Database');
} catch (e) {
  console.log('[Memory] Using local file storage');
}

const LOCAL_FILE = path.join(__dirname, '..', 'memory_store.json');
let localStore = {};

function loadLocal() {
  if (fs.existsSync(LOCAL_FILE)) {
    try {
      localStore = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    } catch (e) {
      localStore = {};
    }
  }
}

function saveLocal() {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(localStore, null, 2));
}

function unwrap(result) {
  if (result && typeof result === 'object' && result.ok !== undefined) {
    return result.value;
  }
  return result;
}

async function getUser(userId) {
  const key = `user_${userId}`;
  const empty = {
    facts: [],
    history: [],
    color: '#ffffff',
    chatModel: 'gemini',
    toolModel: 'gemini',
    createdAt: Date.now()
  };

  if (useReplitDB) {
    try {
      const raw = await db.get(key);
      const data = unwrap(raw);
      
      if (!data) {
        console.log(`[Memory] No data found for ${userId}`);
        return empty;
      }
      
      console.log(`[Memory] Loaded ${userId}: ${data.facts?.length || 0} facts, ${data.history?.length || 0} history`);
      
      return {
        facts: Array.isArray(data.facts) ? data.facts : [],
        history: Array.isArray(data.history) ? data.history : [],
        color: data.color || '#ffffff',
        chatModel: data.chatModel || 'gemini',
        toolModel: data.toolModel || 'gemini',
        embedTitle: data.embedTitle || null,
        embedFooter: data.embedFooter || null,
        createdAt: data.createdAt || Date.now(),
        ...data
      };
    } catch (err) {
      console.error('[Memory] Read error:', err.message);
      return empty;
    }
  } else {
    loadLocal();
    return localStore[key] || empty;
  }
}

async function saveUser(userId, data) {
  const key = `user_${userId}`;
  
  if (useReplitDB) {
    try {
      await db.set(key, data);
      
      // Track user ID in a registry for getAllUserFacts
      const rawRegistry = await db.get('user_registry');
      const registry = unwrap(rawRegistry) || { userIds: [] };
      if (!registry.userIds.includes(userId)) {
        registry.userIds.push(userId);
        await db.set('user_registry', registry);
      }
      
      console.log(`[Memory] Saved ${userId}: ${data.facts?.length || 0} facts, ${data.history?.length || 0} history`);
    } catch (err) {
      console.error('[Memory] Write error:', err.message);
    }
  } else {
    localStore[key] = data;
    saveLocal();
    console.log(`[Memory] Saved ${userId} to file`);
  }
}

async function addFact(userId, fact) {
  const user = await getUser(userId);
  const normalizedFact = fact.trim().toLowerCase();
  
  const exists = user.facts.some(f => f.text.toLowerCase() === normalizedFact);
  if (exists) {
    console.log(`[Memory] Fact already exists for ${userId}: "${fact}"`);
    return false;
  }
  
  user.facts.push({
    text: fact.trim(),
    addedAt: Date.now()
  });
  
  if (user.facts.length > 30) {
    user.facts = user.facts.slice(-30);
  }
  
  await saveUser(userId, user);
  console.log(`[Memory] Added new fact for ${userId}: "${fact}"`);
  return true;
}

async function getFacts(userId) {
  const user = await getUser(userId);
  return user.facts;
}

async function addToHistory(userId, userMsg, botReply) {
  const user = await getUser(userId);
  
  user.history.push({
    user: userMsg.slice(0, 500),
    bot: botReply.slice(0, 1000),
    time: Date.now()
  });
  
  if (user.history.length > 50) {
    user.history = user.history.slice(-50);
  }
  
  await saveUser(userId, user);
  console.log(`[Memory] Added conversation to history for ${userId}`);
}

async function getHistory(userId, limit = 6) {
  const user = await getUser(userId);
  return user.history.slice(-limit);
}

async function clearUser(userId) {
  const key = `user_${userId}`;
  
  if (useReplitDB) {
    try {
      await db.delete(key);
      console.log(`[Memory] Cleared all data for ${userId}`);
    } catch (err) {
      console.error('[Memory] Delete error:', err.message);
    }
  } else {
    delete localStore[key];
    saveLocal();
  }
}

async function buildContext(facts, history, sharedFacts = null) {
  let ctx = '';
  
  // Use provided shared facts or fetch them
  const allUserFacts = sharedFacts || await getAllUserFacts();

  if (allUserFacts && allUserFacts.length > 0) {
    ctx += 'FACTS I KNOW ABOUT USERS (YOU CAN REFERENCE THESE):\n';
    allUserFacts.forEach(f => {
      const factText = typeof f === 'object' ? f.text : f;
      ctx += `- ${factText}\n`;
    });
    ctx += '\n';
  }
  
  if (facts.length > 0) {
    ctx += 'SPECIFIC FACTS ABOUT THIS USER:\n';
    facts.forEach(f => {
      const factText = typeof f === 'object' ? f.text : f;
      ctx += `- ${factText}\n`;
    });
    ctx += '\n';
  }
  
  if (history.length > 0) {
    ctx += 'OUR RECENT CONVERSATION:\n';
    history.forEach(h => {
      ctx += `User: ${h.user}\n`;
      ctx += `You: ${h.bot}\n\n`;
    });
  }
  
  console.log(`[Context] Built context with ${allUserFacts?.length || 0} shared facts, ${facts.length} user facts, ${history.length} history`);
  return ctx;
}

async function getGuildConfig(guildId) {
  const key = `guild_${guildId}`;
  
  if (useReplitDB) {
    try {
      const raw = await db.get(key);
      return unwrap(raw) || {};
    } catch (err) {
      return {};
    }
  } else {
    loadLocal();
    return localStore[key] || {};
  }
}

async function setGuildConfig(guildId, config) {
  const key = `guild_${guildId}`;
  const current = await getGuildConfig(guildId);
  const merged = { ...current, ...config };
  
  if (useReplitDB) {
    try {
      await db.set(key, merged);
    } catch (err) {
      console.error('[Memory] Guild config error:', err.message);
    }
  } else {
    localStore[key] = merged;
    saveLocal();
  }
}

async function getUserColor(userId) {
  const user = await getUser(userId);
  return user.color || '#ffffff';
}

async function setUserColor(userId, color) {
  const user = await getUser(userId);
  user.color = color;
  await saveUser(userId, user);
}

async function getUserEmbedTitle(userId) {
  const user = await getUser(userId);
  return user.embedTitle || null;
}

async function setUserEmbedTitle(userId, title) {
  const user = await getUser(userId);
  user.embedTitle = title;
  console.log(`[Memory] Setting embed title for ${userId}: "${title}"`);
  await saveUser(userId, user);
  console.log(`[Memory] Saved embed title for ${userId}`);
}

async function getUserEmbedFooter(userId) {
  const user = await getUser(userId);
  return user.embedFooter || null;
}

async function setUserEmbedFooter(userId, footer) {
  const user = await getUser(userId);
  user.embedFooter = footer;
  console.log(`[Memory] Setting embed footer for ${userId}: "${footer}"`);
  await saveUser(userId, user);
  console.log(`[Memory] Saved embed footer for ${userId}`);
}

async function getAllUserFacts() {
  const allFacts = [];
  
  if (useReplitDB) {
    try {
      const rawRegistry = await db.get('user_registry');
      const registry = unwrap(rawRegistry) || { userIds: [] };
      
      for (const userId of registry.userIds) {
        const raw = await db.get(`user_${userId}`);
        const data = unwrap(raw);
        if (data && Array.isArray(data.facts)) {
          allFacts.push(...data.facts);
        }
      }
    } catch (err) {
      console.error('[Memory] Error getting all facts:', err.message);
    }
  } else {
    loadLocal();
    Object.keys(localStore).forEach(key => {
      if (key.startsWith('user_')) {
        const data = localStore[key];
        if (data && Array.isArray(data.facts)) {
          allFacts.push(...data.facts);
        }
      }
    });
  }
  
  return allFacts;
}

async function getToolModel(userId) {
  const user = await getUser(userId);
  return user.toolModel || 'gemini';
}

async function setToolModel(userId, model) {
  const key = `user_${userId}`;
  const user = await getUser(userId);
  user.toolModel = model;
  
  if (useReplitDB) {
    try {
      await db.set(key, user);
    } catch (err) {
      console.error('[Memory] Error setting tool model:', err.message);
    }
  } else {
    loadLocal();
    localStore[key] = user;
    saveLocal();
  }
}

module.exports = {
  addFact,
  getFacts,
  addToHistory,
  getHistory,
  clearUser,
  buildContext,
  getGuildConfig,
  setGuildConfig,
  getUserColor,
  setUserColor,
  getUserEmbedTitle,
  setUserEmbedTitle,
  getUserEmbedFooter,
  setUserEmbedFooter,
  getAllUserFacts,
  getToolModel,
  setToolModel
};
