const configStore = require('../memory/configStore');

module.exports = {
  data: { name: 'aichat', description: 'Set AI channel for bot responses' },
  async execute(message, args) {
    if (!message.guild) return message.reply('This command can only be used in a server.');
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply('Please mention a channel. Example: -aichat #channel');

    await configStore.setGuildConfig(message.guild.id, { aiChannelId: channel.id });
    message.reply(`✅ AI chat channel set to ${channel}`);
  }
};