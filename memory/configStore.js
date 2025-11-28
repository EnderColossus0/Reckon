// Config store using Replit DB or file fallback
const path = require('path');
const fs = require('fs');
let useReplitDB = false;
let db = null;
try {
  const ReplitDB = require('@replit/database');
  db = new ReplitDB();
  useReplitDB = true;
} catch(e) {
  useReplitDB = false;
}

const FILE = path.join(__dirname, '..', 'config.json');
let cfg = {};

async function loadFile() {
  if (fs.existsSync(FILE)) {
    try { cfg = JSON.parse(fs.readFileSync(FILE)); } catch(e){ cfg = {}; }
  }
}

async function saveFile() { fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2)); }

async function setGuildConfig(guildId, obj) {
  if (useReplitDB) {
    const cur = (await db.get(`guild_${guildId}`)) || {};
    const merged = Object.assign(cur, obj);
    await db.set(`guild_${guildId}`, merged);
  } else {
    await loadFile();
    cfg[guildId] = Object.assign(cfg[guildId]||{}, obj);
    await saveFile();
  }
}

async function getGuildConfig(guildId) {
  if (useReplitDB) {
    return (await db.get(`guild_${guildId}`)) || null;
  } else {
    await loadFile();
    return cfg[guildId] || null;
  }
}

module.exports = { setGuildConfig, getGuildConfig };
