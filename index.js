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

// --- Keep-alive HTTP server ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', bot: 'Outlaw is running' }));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Keep-alive endpoint listening on port ${PORT}`);
});

// --- Login ---
client.login(process.env.TOKEN);