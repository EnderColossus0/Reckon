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
        createdAt: data.createdAt || Date.now()
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

async function buildContext(facts, history) {
  let ctx = '';
  
  const sharedData = await getSharedFacts();
  const shared = sharedData.facts || [];

  if (shared && shared.length > 0) {
    ctx += 'SHARED KNOWLEDGE (ABOUT ALL USERS):\n';
    shared.forEach(f => ctx += `- ${f.text}\n`);
    ctx += '\n';
  }
  
  if (facts.length > 0) {
    ctx += 'THINGS I KNOW ABOUT THIS USER:\n';
    facts.forEach(f => ctx += `- ${f.text}\n`);
    ctx += '\n';
  }
  
  if (history.length > 0) {
    ctx += 'OUR RECENT CONVERSATION:\n';
    history.forEach(h => {
      ctx += `User: ${h.user}\n`;
      ctx += `You: ${h.bot}\n\n`;
    });
  }
  
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

async function getSharedFacts() {
  const key = 'shared_facts';
  const empty = { facts: [] };
  
  if (useReplitDB) {
    try {
      const raw = await db.get(key);
      const data = unwrap(raw);
      return data || empty;
    } catch (err) {
      return empty;
    }
  } else {
    loadLocal();
    return localStore[key] || empty;
  }
}

async function addSharedFact(fact) {
  const shared = await getSharedFacts();
  const normalizedFact = fact.trim().toLowerCase();
  
  const exists = shared.facts.some(f => f.text.toLowerCase() === normalizedFact);
  if (exists) {
    console.log(`[Memory] Shared fact already exists: "${fact}"`);
    return false;
  }
  
  shared.facts.push({
    text: fact.trim(),
    addedAt: Date.now()
  });
  
  if (shared.facts.length > 50) {
    shared.facts = shared.facts.slice(-50);
  }
  
  if (useReplitDB) {
    try {
      await db.set('shared_facts', shared);
      console.log(`[Memory] Added shared fact: "${fact}"`);
    } catch (err) {
      console.error('[Memory] Shared fact write error:', err.message);
    }
  } else {
    localStore['shared_facts'] = shared;
    saveLocal();
    console.log(`[Memory] Added shared fact to file: "${fact}"`);
  }
  
  return true;
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
  getSharedFacts,
  addSharedFact
};
