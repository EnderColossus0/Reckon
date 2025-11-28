// Memory manager using Replit DB if available, fallback to file
const fs = require('fs');
const path = require('path');
let useReplitDB = false;
let db = null;

try {
  const ReplitDB = require('@replit/database');
  db = new ReplitDB();
  useReplitDB = true;
} catch (e) {
  useReplitDB = false;
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
  if (useReplitDB) {
    const val = await db.get(`user_${userId}`);
    return val || { profile: {}, short: [], meta: {} };
  } else {
    await loadFromFile();
    return store[userId] || { profile: {}, short: [], meta: {} };
  }
}

async function setUserKey(userId, obj) {
  if (useReplitDB) {
    await db.set(`user_${userId}`, obj);
  } else {
    store[userId] = obj;
    saveToFile();
  }
}

async function getUserMemory(userId) { return await getUserKey(userId); }
async function setUserMemory(userId, data) { await setUserKey(userId, data); }
async function clearUserMemory(userId) { if (useReplitDB) { await db.delete(`user_${userId}`); } else { delete store[userId]; saveToFile(); } }

async function getUserProfile(userId) { const u = await getUserKey(userId); return u.profile || {}; }
async function updateUserProfile(userId, obj) { const u = await getUserKey(userId); u.profile = Object.assign(u.profile||{}, obj); await setUserKey(userId, u); }

async function getShortMemory(userId, n=8) { const u = await getUserKey(userId); const arr = u.short||[]; return arr.slice(-n); }
async function pushToShortMemory(userId, entry) { const u = await getUserKey(userId); u.short = u.short || []; u.short.push(entry); if (u.short.length > 80) u.short = u.short.slice(-80); await setUserKey(userId, u); }

async function getUserMeta(userId) { const u = await getUserKey(userId); return u.meta || {}; }
async function setUserMeta(userId, meta) { const u = await getUserKey(userId); u.meta = Object.assign(u.meta||{}, meta); await setUserKey(userId, u); }

module.exports = {
  getUserMemory, setUserMemory, clearUserMemory,
  getUserProfile, updateUserProfile,
  getShortMemory, pushToShortMemory,
  getUserMeta, setUserMeta
};
