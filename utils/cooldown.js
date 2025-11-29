// Cooldown system to prevent API rate limiting
const cooldowns = new Map();

const COOLDOWN_MS = 2000; // 2 second cooldown between commands per user

function getCooldownKey(userId, command) {
  return `${userId}:${command}`;
}

function hasCooldown(userId, command) {
  const key = getCooldownKey(userId, command);
  return cooldowns.has(key);
}

function getCooldownRemaining(userId, command) {
  const key = getCooldownKey(userId, command);
  if (!cooldowns.has(key)) return 0;
  
  const expiresAt = cooldowns.get(key);
  const remaining = Math.max(0, expiresAt - Date.now());
  return remaining;
}

function setCooldown(userId, command) {
  const key = getCooldownKey(userId, command);
  const expiresAt = Date.now() + COOLDOWN_MS;
  cooldowns.set(key, expiresAt);
}

// Clean up expired cooldowns every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of cooldowns.entries()) {
    if (expiresAt <= now) {
      cooldowns.delete(key);
    }
  }
}, 30000);

module.exports = {
  hasCooldown,
  getCooldownRemaining,
  setCooldown,
  COOLDOWN_MS
};
