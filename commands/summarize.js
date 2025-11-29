const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'summarize', description: 'Summarize text' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'summarize')) {
      const remaining = (getCooldownRemaining(message.author.id, 'summarize') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'summarize');

    let text;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        text = repliedTo.content;
      } catch (err) {
        console.error('[Summarize] Error fetching replied message:', err.message);
      }
    }

    if (!text) {
      text = args.join(' ');
    }

    if (!text) {
      return message.reply('❌ Please provide text to summarize or reply to a message. Example: `-summarize your long text here`');
    }
    await message.channel.sendTyping();

    try {
      const prompt = `Summarize the following text in 2-3 sentences, keeping the key points:\n\n${text}`;
      const summary = await toolHandler.generate(message.author.id, prompt);

      const embed = new EmbedBuilder()
        .setTitle('📝 Summary')
        .setDescription(summary.slice(0, 3900))
        .setColor('#FF9500')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Summarize] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
