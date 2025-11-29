require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const aiHandler = require('./ai/aiHandler');
const configStore = require('./memory/configStore');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = '-';
client.commands = new Collection();

// --- Load commands ---
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(path.join(commandsPath, file));
  client.commands.set(cmd.data.name, cmd);
}

// --- Ready ---
client.once('ready', () => {
  console.log(`Bot online as ${client.user.tag}`);
});

// --- Helper: should trigger AI ---
async function shouldTriggerAi(message) {
  if (message.author.bot) return false;
  const guildId = message.guild ? message.guild.id : null;
  const cfg = guildId ? await configStore.getGuildConfig(guildId) : null;

  // If in configured AI channel, respond to everything
  if (cfg && cfg.aiChannelId && message.channel.id === cfg.aiChannelId) return true;

  // Otherwise, check for other triggers
  if (message.mentions.has(client.user)) return true;

  if (message.reference && message.reference.messageId) {
    try {
      const ref = await message.channel.messages.fetch(message.reference.messageId);
      if (ref && ref.author.id === client.user.id) return true;
    } catch {}
  }

  const content = message.content.toLowerCase();
  if (content.includes('outlaw') || content.includes('comrade')) return true;

  return false;
}

// --- Message handler ---
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // --- Commands ---
  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const command = client.commands.get(cmdName);
    if (command) {
      try {
        await command.execute(message, args, client);
      } catch (err) {
        console.error('Command error', err);
        message.reply('There was an error running that command.');
      }
    }

    return;
  }

  // --- AI triggers ---
  try {
    if (await shouldTriggerAi(message)) {
      const userId = message.author.id;
      const guildId = message.guild ? message.guild.id : null;
      const model = aiHandler.getModel(userId);

      const reply = await aiHandler.chat(userId, message.content);

      const userColor = await aiHandler.getUserColor(userId);
      const color = userColor || '#ffffff';

      const embed = new EmbedBuilder()
        .setTitle('Outlaw')
        .setDescription(reply.length > 3900 ? reply.slice(0, 3900) + '…' : reply)
        .setColor(color)
        .setFooter({ text: `Model: ${model}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    }
  } catch (err) {
    console.error('AI trigger error', err);
  }
});

// --- Activity Tracker ---
let lastActivity = Date.now();
let bootTime = Date.now();

function updateActivity() {
  lastActivity = Date.now();
}

client.on('messageCreate', updateActivity);
client.on('ready', updateActivity);
client.on('interactionCreate', updateActivity);

// --- Keep-alive HTTP server with status endpoint ---
const server = http.createServer((req, res) => {
  const uptime = Math.floor((Date.now() - bootTime) / 1000);
  const status = {
    bot: 'Outlaw is running',
    uptime_seconds: uptime,
    uptime_readable: formatUptime(uptime),
    connected: client.isReady(),
    last_activity: new Date(lastActivity).toISOString(),
    timestamp: new Date().toISOString()
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status));
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Keep-alive endpoint listening on port ${PORT}`);
});

// --- Enhanced keep-alive with retry logic ---
let keepAliveInterval;

function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(() => {
    const req = http.get(`http://localhost:${PORT}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`[KeepAlive] ✓ Ping at ${parsed.timestamp} | Uptime: ${parsed.uptime_readable} | Connected: ${parsed.connected}`);
        } catch (e) {
          console.log(`[KeepAlive] ✓ Ping successful at ${new Date().toISOString()}`);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`[KeepAlive] ✗ Ping failed: ${err.message}`);
      // Retry on next cycle
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.error('[KeepAlive] ✗ Ping timeout');
    });
  }, 5 * 60 * 1000); // Ping every 5 minutes
}

// --- Discord connection error handling ---
client.on('error', err => {
  console.error('[Discord] ✗ Client error:', err.message);
});

client.on('warn', warn => {
  console.warn('[Discord] ⚠ Warning:', warn);
});

// --- Graceful shutdown handling ---
process.on('SIGINT', () => {
  console.log('[System] SIGINT received, gracefully shutting down...');
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  server.close(() => {
    console.log('[System] Server closed');
    client.destroy();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('[System] SIGTERM received, gracefully shutting down...');
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  server.close(() => {
    console.log('[System] Server closed');
    client.destroy();
    process.exit(0);
  });
});

process.on('uncaughtException', err => {
  console.error('[System] ✗ Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[System] ✗ Unhandled rejection at', promise, 'reason:', reason);
});

// --- Start systems ---
startKeepAlive();
console.log('[System] Keep-alive system started (pings every 5 minutes)');

// --- Login ---
client.login(process.env.TOKEN);