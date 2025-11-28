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

async function getUser(userId) {
  const key = `user_${userId}`;
  const empty = {
    facts: [],
    history: [],
    createdAt: Date.now()
  };

  if (useReplitDB) {
    try {
      const data = await db.get(key);
      if (!data) return empty;
      return {
        facts: data.facts || [],
        history: data.history || [],
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
    } catch (err) {
      console.error('[Memory] Write error:', err.message);
    }
  } else {
    localStore[key] = data;
    saveLocal();
  }
}

async function addFact(userId, fact) {
  const user = await getUser(userId);
  const normalizedFact = fact.trim().toLowerCase();
  
  const exists = user.facts.some(f => f.text.toLowerCase() === normalizedFact);
  if (exists) return false;
  
  user.facts.push({
    text: fact.trim(),
    addedAt: Date.now()
  });
  
  if (user.facts.length > 30) {
    user.facts = user.facts.slice(-30);
  }
  
  await saveUser(userId, user);
  console.log(`[Memory] Saved fact for ${userId}: "${fact}"`);
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
    } catch (err) {
      console.error('[Memory] Delete error:', err.message);
    }
  } else {
    delete localStore[key];
    saveLocal();
  }
}

function buildContext(facts, history) {
  let ctx = '';
  
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
      return await db.get(key) || {};
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

module.exports = {
  addFact,
  getFacts,
  addToHistory,
  getHistory,
  clearUser,
  buildContext,
  getGuildConfig,
  setGuildConfig
};
