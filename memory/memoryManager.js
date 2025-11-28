const fs = require('fs');
const path = require('path');
let useReplitDB = false;
let db = null;

try {
  const ReplitDB = require('@replit/database');
  db = new ReplitDB();
  useReplitDB = true;
  console.log('[Memory] Using Replit Database for storage');
} catch (e) {
  useReplitDB = false;
  console.log('[Memory] Replit DB not available, using file storage');
}

const FILE = path.join(__dirname, '..', 'ai_memory.json');
let store = {};

async function loadFromFile() {
  if (fs.existsSync(FILE)) {
    try { store = JSON.parse(fs.readFileSync(FILE)); } catch(e){ store = {}; }
  }
}

function saveToFile() {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

async function getUserKey(userId) {
  const defaultData = { profile: {}, conversations: [], knowledge: [], meta: {} };
  
  if (useReplitDB) {
    try {
      const val = await db.get(`user_${userId}`);
      console.log(`[DB Read] user_${userId}: ${val ? 'found' : 'not found'}`);
      if (val) {
        console.log(`[DB Raw Data] Keys: ${Object.keys(val).join(', ')}`);
        console.log(`[DB Raw Data] conversations: ${val.conversations?.length || 'none'}, knowledge: ${val.knowledge?.length || 'none'}, short: ${val.short?.length || 'none'}`);
      }
      
      if (!val) return defaultData;
      
      // Migrate old format (short) to new format (conversations)
      if (val.short && !val.conversations) {
        console.log(`[DB Migration] Converting old format for user_${userId}`);
        val.conversations = val.short.map(entry => {
          if (typeof entry === 'string') {
            return { timestamp: Date.now(), user: entry, ai: '' };
          }
          return entry;
        });
        delete val.short;
      }
      
      // Ensure all required fields exist
      val.profile = val.profile || {};
      val.conversations = val.conversations || [];
      val.knowledge = val.knowledge || [];
      val.meta = val.meta || {};
      
      return val;
    } catch (err) {
      console.error(`[DB Read Error] ${err.message}`);
      return defaultData;
    }
  } else {
    await loadFromFile();
    const val = store[userId];
    if (!val) return defaultData;
    
    // Same migration for file storage
    if (val.short && !val.conversations) {
      val.conversations = val.short.map(entry => {
        if (typeof entry === 'string') {
          return { timestamp: Date.now(), user: entry, ai: '' };
        }
        return entry;
      });
      delete val.short;
    }
    
    val.profile = val.profile || {};
    val.conversations = val.conversations || [];
    val.knowledge = val.knowledge || [];
    val.meta = val.meta || {};
    
    return val;
  }
}

async function setUserKey(userId, obj) {
  if (useReplitDB) {
    try {
      await db.set(`user_${userId}`, obj);
      console.log(`[DB Write] user_${userId}: saved (${obj.conversations?.length || 0} convos, ${obj.knowledge?.length || 0} facts)`);
    } catch (err) {
      console.error(`[DB Write Error] ${err.message}`);
    }
  } else {
    store[userId] = obj;
    saveToFile();
  }
}

async function getUserMemory(userId) { return await getUserKey(userId); }
async function setUserMemory(userId, data) { await setUserKey(userId, data); }
async function clearUserMemory(userId) { 
  if (useReplitDB) { 
    await db.delete(`user_${userId}`); 
  } else { 
    delete store[userId]; 
    saveToFile(); 
  } 
}

async function getUserProfile(userId) { 
  const u = await getUserKey(userId); 
  return u.profile || {}; 
}

async function updateUserProfile(userId, obj) { 
  const u = await getUserKey(userId); 
  u.profile = Object.assign(u.profile||{}, obj); 
  await setUserKey(userId, u); 
}

async function getConversationHistory(userId, limit = 10) {
  const u = await getUserKey(userId);
  const conversations = u.conversations || [];
  return conversations.slice(-limit);
}

async function addConversation(userId, userMessage, aiResponse) {
  const u = await getUserKey(userId);
  u.conversations = u.conversations || [];
  u.conversations.push({
    timestamp: Date.now(),
    user: userMessage,
    ai: aiResponse
  });
  if (u.conversations.length > 100) {
    u.conversations = u.conversations.slice(-100);
  }
  await setUserKey(userId, u);
}

async function getKnowledge(userId) {
  const u = await getUserKey(userId);
  return u.knowledge || [];
}

async function addKnowledge(userId, fact) {
  const u = await getUserKey(userId);
  u.knowledge = u.knowledge || [];
  const exists = u.knowledge.some(k => k.fact.toLowerCase() === fact.toLowerCase());
  if (!exists) {
    u.knowledge.push({
      fact: fact,
      addedAt: Date.now()
    });
    if (u.knowledge.length > 50) {
      u.knowledge = u.knowledge.slice(-50);
    }
    await setUserKey(userId, u);
  }
}

async function removeKnowledge(userId, factToRemove) {
  const u = await getUserKey(userId);
  u.knowledge = (u.knowledge || []).filter(k => 
    !k.fact.toLowerCase().includes(factToRemove.toLowerCase())
  );
  await setUserKey(userId, u);
}

async function getUserMeta(userId) { 
  const u = await getUserKey(userId); 
  return u.meta || {}; 
}

async function setUserMeta(userId, meta) { 
  const u = await getUserKey(userId); 
  u.meta = Object.assign(u.meta||{}, meta); 
  await setUserKey(userId, u); 
}

function buildContextPrompt(conversationHistory, knowledge, userProfile) {
  let context = '';
  
  if (knowledge && knowledge.length > 0) {
    context += 'IMPORTANT FACTS ABOUT THIS USER:\n';
    knowledge.forEach(k => {
      context += `- ${k.fact}\n`;
    });
    context += '\n';
  }
  
  if (userProfile && Object.keys(userProfile).length > 0) {
    context += 'USER PROFILE:\n';
    for (const [key, value] of Object.entries(userProfile)) {
      context += `- ${key}: ${value}\n`;
    }
    context += '\n';
  }
  
  if (conversationHistory && conversationHistory.length > 0) {
    context += 'RECENT CONVERSATION HISTORY:\n';
    conversationHistory.forEach(conv => {
      context += `User: ${conv.user}\n`;
      context += `You: ${conv.ai}\n\n`;
    });
  }
  
  return context;
}

module.exports = {
  getUserMemory, setUserMemory, clearUserMemory,
  getUserProfile, updateUserProfile,
  getConversationHistory, addConversation,
  getKnowledge, addKnowledge, removeKnowledge,
  getUserMeta, setUserMeta,
  buildContextPrompt
};
